/// <reference path='./typings/main.d.ts' />

import express = require('express');
import path = require('path');
import favicon = require('serve-favicon');
import logger = require('morgan');
import cookieParser = require('cookie-parser');
import bodyParser = require('body-parser');

import routes = require('./routes/index');
import questions = require('./routes/questions');
import {Request} from 'express-serve-static-core';
import {Response} from "express-serve-static-core";
import {NextFunction} from "express-serve-static-core";

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger((req: Request, res: Response) => 'dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('node-sass-middleware')({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true,
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/questions', questions);

// catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  var err = new Error('Not Found');
  err['status'] = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use((err: any, req: Request, res: Response) => {
    res.status(err['status'] || 500);
    res.render('error', {
      message: err['message'],
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err: any, req: Request, res: Response) => {
  res.status(err['status'] || 500);
  res.render('error', {
    message: err['message'],
    error: {}
  });
});

export = app;
