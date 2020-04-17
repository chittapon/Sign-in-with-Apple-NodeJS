require('dotenv').config()

const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken');
const fs = require('fs')
const axios = require('axios')
const querystring = require('querystring')

const getClientSecret = () => {
	// sign with RSA SHA256
	const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_FILE_PATH);
	const headers = {
		kid: process.env.KEY_ID,
	}
	const claims = {
		'iss': process.env.TEAM_ID,
		'aud': 'https://appleid.apple.com',
		'sub': process.env.CLIENT_ID,
	}

	token = jwt.sign(claims, privateKey, {
		algorithm: 'ES256',
		header: headers,
		expiresIn: '24h'
	});

	return token
}

const getUserId = (token) => {
	const parts = token.split('.')
	try {
		return JSON.parse(new Buffer(parts[1], 'base64').toString('ascii'))
	} catch (e) {
		return null
	}
}

app.post('/callback', bodyParser.urlencoded({ extended: false }), (req, res) => {

	console.log('response: ', req.body)

	const clientSecret = getClientSecret()
	const requestBody = {
		grant_type: 'authorization_code',
		code: req.body.code,
		redirect_uri: process.env.REDIRECT_URI,
		client_id: process.env.CLIENT_ID,
		client_secret: clientSecret,
		scope: process.env.SCOPE,
		code: req.body.code,
		state: req.body.state
	}

	axios.request({
		method: "POST",
		url: "https://appleid.apple.com/auth/token",
		data: querystring.stringify(requestBody),
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
	}).then(response => {
		console.log('response from apple: ', response.data)

		var html = "<html><body><script>function webBody() {alert(\"OK\"); webBody();}</script></body></html>";
		res.type('html')
		return res.send(html);

		
		return res.sendFile(path.join(__dirname, 'jsinterface.html'))
		return res.json({
			success: true,
			data: response.data,
			user: getUserId(response.data.id_token)
		})
	}).catch(error => {
		return res.status(500).json({
			success: false,
			error: error.response.data
		})
	})
})


process.env['PRIVATE_KEY_FILE_PATH'] = 'AuthKey_58VP6JAB9F.p8';
process.env['TEAM_ID'] = 'BT896L4Y6Y';
process.env['KEY_ID'] = '58VP6JAB9F';
process.env['CLIENT_ID'] = 'com.pap.signinwithapple.service';
process.env['REDIRECT_URI'] = 'https://pap-sign-in-with-apple.herokuapp.com/callback';
process.env['SCOPE'] = 'name email';

app.listen(process.env.PORT || 3000, () => console.log(`App listening on port ${process.env.PORT || 3000}!`))