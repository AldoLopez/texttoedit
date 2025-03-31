import express, { Request, Response, NextFunction } from 'express'
import twilio from 'twilio';
import pluralize from 'pluralize';
import { decode } from 'base64-arraybuffer';
const { MessagingResponse } = twilio.twiml;
import { Tables } from '../middlewares/helpers/database.types.ts';

// get account from my db
const getAccount = async ({ supabase }: Request, phoneNumber: string) => {
  console.log('Getting account', phoneNumber);
  const { data, error } = await supabase.from('accounts')
    .select('*')
    .eq('account_number', '19735836187')
    .single<Tables<'accounts'>>();
  if (error) {
    console.error('Error fetching account', error);
    return null;
  }
  console.log(data);
  // get account from db
  // return account
  return {
    phoneNumber,
    subscription: {
      // @ts-ignore
      preview: false,
      // @ts-ignore
      media: true,
      // @ts-ignore
      maxMedia: 5,
      // @ts-ignore
      mediaSize: 25 * 1024 * 1024, // 5MB
      // @ts-ignore
      website: 1,
      ...data, // add data from db
    },
  };
};

const router = express.Router();
enum MediaTypes {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  // not supported yet
  // AUDIO = 'audio',
  // DOCUMENT = 'document',
}
enum TextUpdates {
  BIO = 'bio',
  LOCATION = 'location',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  FACEBOOK = 'facebook',
  SNAPCHAT = 'snapchat',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  WHATSAPP = 'whatsapp',
}
router.post('/', async (req, res) => {
  const supabase = req.supabase;
  const {
    NumMedia: numMedia,
    From,
    Body: body,
    MessageSid: messageSid,
    AccountSid: accountSid,
    To: to,
  } = req.body;
  // strip non numeric characters from phone number
  const from = From.replace(/\D/g, '');

  // log body
  const account = await getAccount(req, from);
  const twilioMl = new MessagingResponse();
  // check if account exists
  if (!account) {
    console.log('Account not found', from);
    twilioMl.message('Account not found')
    res.type('text/xml').send(twilioMl.toString());
    return;
  }
  const message = twilioMl.message('Got it! Updating soon...');
  // check if media is present
  if (numMedia > 0) {
    // get all media types
    const supportedMedia = [];
    const unsupportedMediaTypes = [];
    for (let i = 0; i < numMedia; i++) {
      const currentMediaType = req.body[`MediaContentType${i}`];
      if (currentMediaType) {
        const mediaType = currentMediaType.split('/')[0];
        // check type and size
        if (Object.values(MediaTypes).includes(mediaType)) {
          supportedMedia.push({
            mediaType,
            mediaFileType: currentMediaType.split('/')[1],
            mediaSize: req.body[`MediaContentLength${i}`],
            mediaUrl: req.body[`MediaUrl${i}`],
          }); //mediaUrl
        } else {
          unsupportedMediaTypes.push(mediaType);
        }
      }
    }

    const isMediaSupported = supportedMedia.length > 0;
    if (isMediaSupported) {
      message.addText(`Your media and uploading now!`);
      await Promise.allSettled(supportedMedia.map(async (media) => {
        const { mediaType, mediaUrl, mediaFileType } = media;
        const imageRes = await fetch(mediaUrl);
        const body = await imageRes.arrayBuffer();
        const imageBuffer = Buffer.from(body);
        const { data, error } = await supabase.storage
          .from('website-media')
          .upload(`${from}/${messageSid}.${mediaFileType}`, decode(imageBuffer.toString('base64')), {
            contentType: `${mediaType}/${mediaFileType}`,
            upsert: true,
          });
        if (error) {
          console.error('Error uploading media', error);
          message.addText(`Error uploading ${mediaType}`);
        }
      }));
    }
    if (unsupportedMediaTypes.length > 0) {
      // handle unsupported media
      message.addText(`We don't support ${unsupportedMediaTypes.join(', ')} yet.`);
    }
  } else {
    const text = body.trim();
    // not sure if i want to check a keyword, but i will for now
    const splitText = text.split(':');
    const keyword = splitText[0].trim().toLowerCase();
    const textBody = splitText[1]?.trim();
    const isValidKeyword = Object.values(TextUpdates).includes(keyword);
    if (!isValidKeyword || !textBody) {
      message.body(`Please send a message stating what you'd like to change using a keyword.
        Use these keywords followd by ':' to start: ${Object.values(TextUpdates).join(', ')}.
        \n\n
        Example: ${TextUpdates.BIO}: We are a family business.'`);
      res.type('text/xml').send(twilioMl.toString());
      return;
    }
    // if subscription includes preview update temp bucket and db
    const { error } = await supabase
      .from('websites')
      .update({
        [keyword]: textBody,
      })
      .eq('id', account.subscription.website);

    if (error) {
      console.error('Error updating website', error);
      message.addText(`Error updating ${keyword}`);
    }
  }
  res.type('text/xml').send(twilioMl.toString());
});

export default router;