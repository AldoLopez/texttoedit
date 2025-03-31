import express, { Request, Response, NextFunction} from 'express';
import createError from 'http-errors';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

import indexRouter from './routes/index.ts';
import usersRouter from './routes/users.ts';
import textRouter from './routes/text.ts';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { supabaseClient } from './middlewares/supabaseClient.ts';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(supabaseClient);

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/twilio', textRouter);

// catch 404 and forward to error handler
app.use((_req: Request, _res, next: NextFunction) => {
  next(createError(404));
});

// error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
