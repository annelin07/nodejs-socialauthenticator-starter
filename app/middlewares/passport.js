let LocalStrategy = require('passport-local').Strategy
let passport = require('passport')
let nodeifyit = require('nodeifyit')
let FacebookStrategy = require('passport-facebook').Strategy
require('songbird')
let config = require('../../config/auth')
let User = require('../models/user')

function useExternalPassportStrategy(OauthStrategy, config, accountType) {
    config.passReqToCallback = true

    passport.use(new OauthStrategy(config, nodeifyit(authCB, {spread: true})))
    console.log(">< facebook strategy")

    async function authCB(req, token, _ignored_, account) {
      console.log("><authCB")
      console.log(">< account id", account.id)
        // Your generic 3rd-party passport strategy implementation here
    }
}

function configure(config) {
 passport.serializeUser(nodeifyit(async (user) => user._id))
  passport.deserializeUser(nodeifyit(async (id) => {
    return await User.promise.findById(id)
  }))

  passport.use(new LocalStrategy({
    // Use "email" field instead of "username"
    usernameField: 'username',
    failureFlash: true
  }, nodeifyit(async (username, password) => {
    let user
    let email = username.toLowerCase()
    user = await User.promise.find({'local.email': email})

    //console.log("local login user", user)

    if (!user) return [false, {message: 'Invalid email'}]
    if (username.indexOf('@') >= 0 ) {
      if (username !== user.local.email) {
        return [false, {message: 'Invalid email'}]
      }
    }

    if (!await user.validatePassword(password)) {
      return [false, {message: 'Invalid password'}]
    }
    return user

  }, {spread: true})))


  passport.use('local-signup', new LocalStrategy({
    // Use "email" field instead of "username"
    usernameField: 'email',
    failureFlash: true,
    passReqToCallback: true
  }, nodeifyit(async (req, email, password) => {
    email = (email || '').toLowerCase()
    // Is the email taken?
    // if (await User.promise.find({'local.email': email})) {
    //   return [false, {message: 'That email is already taken.'}]
    // }

    // create the user
    let user = new User()
    user.local.email = email
    user.local.password = password

     try {
      return await user.save()
    } catch(e) {
      //console.log('error on save user', util.inspect(e))
      return [false, {message: e.message}]
    }
  }, {spread: true})))

  return passport
}

useExternalPassportStrategy(FacebookStrategy, {
    clientID: config.facebookAuth.consumerKey,
    clientSecret: config.facebookAuth.consumerSecret,
    callbackURL: config.facebookAuth.callbackUrl
}, 'facebook')

module.exports = {passport, configure}
