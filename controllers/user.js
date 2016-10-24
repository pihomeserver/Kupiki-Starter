const async = require('async');
const nodemailer = require('nodemailer');
const passport = require('passport');
const crypto = require('crypto');

const User = require('../database/models').User;

const hash = (pwd) => {
  return crypto
    .createHash('sha1')
    .update(pwd)
    .digest('hex');
};

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/login', {
    title: 'Login'
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
  req.assert('password', 'Password cannot be blank').notEmpty();
  //req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('errors', info);
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Success! You are logged in.' });
      res.redirect(req.session.returnTo || '/');
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
  req.logout();
  res.redirect('/');
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/signup', {
    title: 'Create Account'
  });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/signup');
  }

  const user = User.build(req.body);

  User.findOne({ username: req.body.username })
    .then(existingUser => {
      if (existingUser) {
        req.flash('errors', { msg: 'Account with that username already exists.' });
        return res.redirect('/signup');
      }
      user.password = hash(user.password);
      user.save()
        .then((user) => {
          req.logIn(user, (err) => {
            if (err) {
              return next(err);
            }
            res.redirect('/');
          });
        })
        .catch(err => next(err));
    })
    .catch(err => next(err));
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
  res.render('account/profile', {
    title: 'Account Management'
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
  User.destroy({ 
    where: {
      id: req.user.id 
    }
  }).then(deletedElts => {
    console.log(deletedElts)
    req.logout();
    req.flash('info', { msg: 'Your account has been deleted.' });
    res.redirect('/');
  })
  .catch(err => next(err));
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
  if (req.body.email) req.assert('email', 'Please enter a valid email address.').isEmail();
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findOne({ id: req.user.id })
    .then(user => {
      user.email = req.body.email || '';
      user.name = req.body.name || '';
      user.gender = req.body.gender || '';
      user.location = req.body.location || '';
      user.website = req.body.website || '';
      user.save()
        .then((user) => {
          req.flash('success', { msg: 'Profile information has been updated.' });
          res.redirect('/account');
        })
        .catch(err => {
            console.log(err)
            if (err.code === 11000) {
              req.flash('errors', { msg: 'The email address you have entered is already associated with an account.' });
              return res.redirect('/account');
            }
            return next(err);
        });
    })
    .catch(err => next(err));
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findOne({ id: req.user.id })
    .then(user => {
      user.password = hash(req.body.password);
      user.save()
        .then((user) => {
          req.flash('success', { msg: 'Password has been changed.' });
          res.redirect('/account');
        })
        .catch(err => next(err));
      
    })
    .catch(err => next(err));
};