var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

const jwt = require('jsonwebtoken');
var session = require('express-session')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
var sess = {
  secret: 'keyboard cat',
  cookie: {}
}

const { auth, requiresAuth } = require('express-openid-connect');
// app.use(
//   auth({
//     authorizationParams: {
//       response_type: 'code',
//       audience: "http://localhost:3000",
//       scope: 'openid profile email offline_access read:products'
//     }, 
//     // authRequired: false,
//     // issuerBaseURL: 'https://dev-shoulder.eu.auth0.com',
//     // baseURL: 'http://localhost:3000',
//     // clientID: 'wUSMY73S4kThOh6C4KMSTLp6aMrXRHR8',
//     // secret: '4ay0_BihOY9TTZ8_H7-2PtzD6Upz0xFP8hCCIQ62Ch3Lv1tTQRcRE7OeiE3YEoaK',
//     // idpLogout: true,
//   })
// );


if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess))

app.use(
  auth({
    authRequired: false,
    authorizationParams: {
      response_type: 'code', // This requires you to provide a client secret
      audience: 'http://localhost:3000',
      scope: 'openid profile email read:products',
      prompt: 'consent',
    },
    routes: {
      // Override the default login route to use your own login route as shown below
      login: false,
      // Pass a custom path to redirect users to a different
      // path after logout.
      postLogoutRedirect: '/custom-logout',
      // Override the default callback route to use your own callback route as shown below
    },
  })
);

app.get('/login', (req, res) =>
  res.oidc.login({
    returnTo: '/profile',
    authorizationParams: {
      redirect_uri: 'http://localhost:3000/callback',
    },
  })
);


app.get('/logout', (req, res) =>
  res.oidc.logout()
);


app.get('/profile', requiresAuth(), async (req, res) => {
  // const userInfo = await req.oidc.fetchUserInfo();
  // return res.json({userInfo});

  let { token_type, access_token } = req.oidc.accessToken;

  res.json({"user": req.oidc.user, token_type, access_token});
});

app.get('/custom-logout', (req, res) => res.send('Bye!'));

app.get('/callback', (req, res) => {
  console.log('callback')
  res.oidc.callback({
    redirectUri: 'http://localhost:3000/callback',
  })
});

app.post('/callback', express.urlencoded({ extended: false }), (req, res) => {
  console.log('callback')

  res.oidc.callback({
    redirectUri: 'http://localhost:3000/callback',
  })
});


module.exports = app;
