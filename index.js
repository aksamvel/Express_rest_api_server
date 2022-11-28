require('dotenv').config();
connection = null;
let {server, app} = require('./server');
let mysqlDB = require('./mysqlDB');
let mysqlRequests = require('./mysqlRequests')(null);
const sha1 = require("sha1");
const fs = require("fs");
const multer = require("multer");

let Equipment = require('./equipment');
let Maintenance = require('./maintenance');
let Defect = require('./defect');
let Lessor = require('./lessor');
let Contract = require('./contract');
let Service = require('./service');
let User = require('./user');
let Auth = require('./auth');

console.log('start');

// initial connect.
mysqlDB.connect().then(function (conn) {
    console.log('server loaded');
    apiHandlers();
});

function apiHandlers() {
    // Handler to login user.
    app.post('/api/auth', function(req, res) {
        if (req.body.username && req.body.password) {
            Auth.auth(req.body.username, req.body.password)
                .then(function (data) {
                    res.status(200).json(data)
                })
                .catch(function (data) {
                    res.status(200).json(data)
                });
        }
        else {
            return res.status(200).json({
                status: 'error',
                code: '10002',
                errors: ['Username or password missing'],
            })
        }

    });

    app.post('/api/gps', function(req, res) {
        console.log('api gps body:', req.body)
        return res.status(200).send('OK');

    });

    // auth
    // handle('post', '/api/auth', Auth.apiGetSiteSettings, ['administrator', 'operator']);
    handle('get', '/api/settings', Auth.apiGetSiteSettings, ['administrator', 'operator']);

    // users
    handle('get', '/api/users', User.apiGetListHandler, ['administrator']);
    handle('delete', '/api/user/:user', User.apiDeleteHandler, ['administrator']);
    handle('post', '/api/user', User.apiCreateHandler, ['administrator']);
    handle('put', '/api/user/:user', User.apiUpdateHandler, ['administrator']);

    // lessors
    let createLessorMulterConfig = multer({ dest: './public/lessor/'}).fields(
        [
            {
                name: 'photo',
                maxCount: 1
            },
            {
                name: 'passCopy',
                maxCount: 1
            }
        ]
    );
    let updateLessorMulterConfig = multer({ dest: './public/lessor/'}).fields(
        [
            {
                name: 'photo',
                maxCount: 1
            },
            {
                name: 'passCopy',
                maxCount: 1
            }
        ]
    );

    handle('post', '/api/lessor', Lessor.apiCreateHandler, ['administrator', 'operator'], createLessorMulterConfig);
    handle('put', '/api/lessor/:lessor', Lessor.apiUpdateHandler, ['administrator', 'operator'], updateLessorMulterConfig);
    handle('get', '/api/lessors', Lessor.apiGetListHandler, ['administrator', 'operator']);
    handle('get', '/api/lessor/:lessor', Lessor.apiGetSingleHandler, ['administrator', 'operator']);
    handle('delete', '/api/lessor/:lessor', Lessor.apiDeleteHandler, ['administrator', 'operator']);

    // equipments
    let createEquipmentMulterConfig = multer({ dest: './public/equipment/'}).fields([{name: 'photo', maxCount: 1}]);
    let updateEquipmentMulterConfig = multer({ dest: './public/equipment/'}).fields([{name: 'photo', maxCount: 1}]);

    handle('post', '/api/equipment', Equipment.apiCreateHandler, ['administrator'], createEquipmentMulterConfig);
    handle('put', '/api/equipment/:equipment', Equipment.apiUpdateHandler, ['administrator', 'operator'], updateEquipmentMulterConfig);
    handle('get', '/api/equipment/:equipment', Equipment.apiGetSingleHandler, ['administrator', 'operator']);
    handle('get', '/api/equipments', Equipment.apiGetListHandler, ['administrator', 'operator']);
    handle('delete', '/api/equipment/:equipment', Equipment.apiDeleteHandler, ['administrator', 'operator']);

    // maintenances.
    handle('post', '/api/maintenance', Maintenance.apiCreateHandler, ['administrator', 'operator']);
    handle('put', '/api/maintenance/:maintenance', Maintenance.apiUpdateHandler, ['administrator', 'operator']);
    handle('delete', '/api/maintenance/:maintenance', Maintenance.apiDeleteHandler, ['administrator']);
    handle('get', '/api/maintenances', Maintenance.apiGetListHandler, ['administrator', 'operator']);

    // defects.
    let createDefectMulterConfig = multer({ dest: './public/defects/'}).fields(
        [
            {
                name: 'photo',
                maxCount: 1
            },
        ]
    );
    let updateDefectMulterConfig = multer({ dest: './public/defects/'}).fields([{name: 'photo', maxCount: 1}]);
    handle('post', '/api/defect', Defect.apiCreateHandler, ['administrator', 'operator'], createDefectMulterConfig);
    handle('get', '/api/defects', Defect.apiGetListHandler, ['administrator', 'operator']);
    handle('put', '/api/defect/:defect', Defect.apiUpdateHandler, ['administrator', 'operator'], updateDefectMulterConfig);
    handle('delete', '/api/defect/:defect', Defect.apiDeleteHandler, ['administrator', 'operator']);

    // contracts.
    handle('post', '/api/contract', Contract.apiCreateHandler, ['administrator', 'operator']);
    handle('get', '/api/contracts', Contract.apiGetListHandler, ['administrator', 'operator']);
    handle('get', '/api/contract/:contract', Contract.apiGetSingleHandler, ['administrator', 'operator']);
    handle('put', '/api/contract/:contract', Contract.apiUpdateHandler, ['administrator', 'operator']);
    handle('delete', '/api/contract/:contract', Contract.apiDeleteHandler, ['administrator']);

    // services.
    handle('post', '/api/service', Service.apiCreateHandler, ['administrator', 'operator']);
    handle('get', '/api/services', Service.apiGetListHandler, ['administrator', 'operator']);
    handle('put', '/api/service/:service', Service.apiUpdateHandler, ['administrator', 'operator']);
    handle('delete', '/api/service/:service', Service.apiDeleteHandler, ['administrator']);

    // Don't touch them, affect all handle functions.
    function handle(type, path, apiHandler, rights = [], config = null) {
        if (config) {
            app[type](path, config, handleRights.bind(null, {apiHandler: apiHandler, accessRoles: rights}));
        }
        else {
            app[type](path, handleRights.bind(null, {apiHandler: apiHandler, accessRoles: rights}));
        }
    }
    function handleRights (args, req, res) {
        if (req.headers.appauth) {
            mysqlRequests.checkAuth(req.headers.appauth)
              .then(function (authedUser) {
                    if (args.accessRoles.includes(authedUser.role)) {
                        args.apiHandler(req.params, (req.method === 'GET') ? req.query : req.body, req.files, authedUser)
                            .then(function (data) {
                                res.status(200).json(data)
                            })
                            .catch(function (data) {
                                res.status(200).json(data)
                            });
                    }
                    else {
                        return res.status(200).json({
                            status: 'error',
                            code: '10005',
                            errors: ['Access denied'],
                        });
                    }
                })
                .catch(function (errorData) {
                    res.status(200).json(errorData)
                });
        }
        else {
            return res.status(200).json({
                status: 'error',
                code: '10003',
                errors: ['Для работы с сайтом необходимо авторизоваться'],
            })
        }
    }
}


