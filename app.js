var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
require('dotenv').config();


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  let error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.json(error);
});

app.listen(process.env.PORT, ()=>{console.log('server is running on port '+process.env.PORT)})

module.exports = app;
