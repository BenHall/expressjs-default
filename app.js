var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

const jwt = require('jsonwebtoken');
var session = require('express-session')
const request = require('request-promise-native');

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
const { requiredScopes } = require('express-oauth2-jwt-bearer');

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
    clientAssertionSigningAlg: 'RS256',
    // jwksUri: 'https://dev-shoulder.eu.auth0.com/.well-known/jwks.json',
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
    afterCallback: (req, res, session) => {
      const claims = jwt.decode(session.id_token); 

      if (claims.org_id !== 'Required Organization') {
        throw new Error('User is not a part of the Required Organization');
      }
      return session;
    }
  })
);

app.get('/logout', (req, res) =>
  res.oidc.logout()
);

app.get('/', requiresAuth(), async (req, res) => {
  let { token_type, access_token, isExpired, refresh } = req.oidc.accessToken;
  if (isExpired()) {
    ({ access_token } = await refresh());
  }
  const products = await request.get(`http://localhost:3002/products`, {
    headers: {
      Authorization: `${token_type} ${access_token}`,
    },
    json: true,
  });
  res.send(`Products: ${products.map(({ name }) => name).join(', ')}`);
});

app.get('/profile', requiresAuth(), async (req, res) => {
  // const userInfo = await req.oidc.fetchUserInfo();
  // return res.json({userInfo});

  let { token_type, access_token, isExpired, refresh } = req.oidc.accessToken;
  if (isExpired()) {
    console.log("Expired")
    ({ access_token } = await refresh());
  }

  // var axios = require("axios").default;

  // {"user":[{"permission_name":"read:products","description":"read:products","resource_server_name":"Shoulder Localhost","resource_server_identifier":"http://localhost:3000","sources":[{"source_id":"","source_name":"","source_type":"DIRECT"}]}]}
  // var options = {
  //   method: 'GET',
  //   url: 'https://dev-shoulder.eu.auth0.com/api/v2/users/' + req.oidc.user.sub + '/permissions',
  //   headers: {authorization: 'Bearer ' + process.env.MGMT_API_ACCESS_TOKEN}
  // };

  // axios.request(options).then(function (response) {
  //   console.log(response.data);
  //   res.json({"user": response.data});

  // }).catch(function (error) {
  //   console.error(error);
  //   res.json({"error": error});
  // });

  var axios = require("axios").default;

  // var options = {
  //   method: 'POST',
  //   url: 'https://dev-shoulder.eu.auth0.com/api/v2/users/' + req.oidc.user.sub + '/permissions',
  //   headers: {
  //     'content-type': 'application/json',
  //     authorization: 'Bearer ' + process.env.MGMT_API_ACCESS_TOKEN,
  //     'cache-control': 'no-cache'
  //   },
  //   data: {
  //     permissions: [
  //       {
  //         resource_server_identifier: 'http://localhost:3000',
  //         permission_name: 'read:products'
  //       }
  //     ]
  //   }
  // };

  // var options = {
  //   method: 'POST',
  //   url: 'https://dev-shoulder.eu.auth0.com/api/v2/users/' + req.oidc.user.sub + '/roles',
  //   headers: {
  //     'content-type': 'application/json',
  //     authorization: 'Bearer ' + process.env.MGMT_API_ACCESS_TOKEN,
  //     'cache-control': 'no-cache'
  //   },
  //   data: {roles: ['rol_rML30VwXkSYRGBkW']}
  // };

  // axios.request(options).then(function (response) {
  //   console.log(response.data);
  //   res.json({"user": response.data});
  // }).catch(function (error) {
  //   console.error(error);
  //   res.json({"error": error});
  // });

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
