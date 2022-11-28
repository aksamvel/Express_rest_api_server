let https = require('https');
let express = require('express');
let bodyParser = require('body-parser'); //connects bodyParsing middleware
const cors = require('cors');
let multer = require('multer');
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(multer({dest: './public/files/'}).fields(

app.use('/public', express.static('public'));
app.use(cors());

let fs = require("fs");
let privateKey = fs.readFileSync(process.env.CERT_KEY_PATH).toString();
let certificate = fs.readFileSync(process.env.CERT_CRT_PATH).toString();
let credentials = {key: privateKey, cert: certificate};
// let credentials = {};

let server = https.createServer(credentials, app);

server.listen(process.env.API_PORT, function() {
    console.log('server up and running at %s port', process.env.API_PORT);
});

app.use(function(req, res, next) {
    // Append headers for CORS.
    res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

module.exports = {
    server,
    app,
};