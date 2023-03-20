require('dotenv').config()

const express = require('express');
const { auth, requiredScopes } = require('express-oauth2-jwt-bearer');

const jwt = require('jsonwebtoken');


const app = express();
// https://dev-shoulder.eu.auth0.com/.well-known/openid-configuration
app.use(auth({ secret: false }));

app.get('/products', requiredScopes('read:products'), (req, res) => {
  const auth = req.auth;
  console.log(auth, jwt.decode(auth.token));
  const user = jwt.decode(auth.token);
  console.log(user.sub);
  res.json([
    { id: 1, name: 'Football boots' },
    { id: 2, name: 'Running shoes' },
    { id: 3, name: 'Flip flops' },
  ]);
});

app.listen(3002, () =>
  console.log(`Example app started at http://localhost:3002`)
);
