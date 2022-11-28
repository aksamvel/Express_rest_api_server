let mysqlRequests = require('./mysqlRequests')(null);
let Logger = require('./logger');

module.exports = class Equipment {

    static apiCreateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            let errorData = Equipment.apiValidateCreateHandlerFields(body);
            if (errorData) {
                return reject(errorData)
            }

            let equipment = {
                title: body.title,
                type: body.type,
                purchasingPrice: body.purchasingPrice,
                marketPrice: body.marketPrice,
                serialNumber: body.serialNumber,
                currentWorkHours: body.currentWorkHours,
                hourRate: body.hourRate,
                dayRate: body.dayRate,
                weekRate: body.weekRate,
            }

            let photo = '';
            if (files && files.photo) {
                let photoFile = files.photo.pop();
                photo = photoFile.path;
            }

            mysqlRequests.createEquipment(equipment, photo)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Equipment create', entityType: 'equipment', entityAction: 'create', entityId: data.data.equipmentId});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiGetListHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (body.withContracts && body.withContracts === '1') {
                mysqlRequests.requestEquipmentsWithContracts(authedUser.role)
                    .then(function (data) {
                        resolve(data);
                    });
            }
            else {
                mysqlRequests.requestEquipments(authedUser.role)
                    .then(function (data) {
                        resolve(data);
                    });
            }
        });
    }

    static apiGetSingleHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.equipment) {
                return reject({
                    status: 'error',
                    code: '10022',
                    errors: ['Equipment id missing'],
                });
            }

            mysqlRequests.requestEquipment(params.equipment, authedUser.role)
                .then(function (data) {
                    resolve(data)
                });
        });
    }

    static apiDeleteHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.equipment) {
                return reject({
                    status: 'error',
                    code: '10022',
                    errors: ['Equipment id missing'],
                });
            }

            mysqlRequests.removeEqupment(params.equipment)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Equipment delete', entityType: 'equipment', entityAction: 'delete', entityId: params.equipment});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiUpdateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.equipment) {
                return reject({
                    status: 'error',
                    code: '10022',
                    errors: ['Equipment id missing'],
                });
            }

            let errorData = Equipment.apiValidateUpdateHandlerFields(body);
            if (errorData) {
                return reject(errorData);
            }

            let photo = null;
            if (files && files.photo) {
                let photoFile = files.photo.pop();
                photo = photoFile.path;
            }
            else if (body.photo || body.photo === '') {
                photo = body.photo;
            }

            mysqlRequests.updateEquipment(body, params.equipment, photo)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Equipment update', entityType: 'equipment', entityAction: 'update', entityId: params.equipment});
                    resolve(data);
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiValidateUpdateHandlerFields(data) {
        let fieldsErrors = [];

        if (data.title && data.title.length > 255) {
            fieldsErrors.push('Title field length 255 characters max');
        }
        if (data.type && data.type.length > 128) {
            fieldsErrors.push('Type field length 255 characters max');
        }
        if (data.purchasingPrice && data.purchasingPrice.length > 20) {
            fieldsErrors.push('Purchasing price field length 20 characters max');
        }
        if (data.marketPrice && data.marketPrice.length > 20) {
            fieldsErrors.push('Market price field length 20 characters max');
        }
        if (data.serialNumber && data.serialNumber.length > 255) {
            fieldsErrors.push('Serial number field length 512 characters max');
        }
        if (data.currentWorkHours && data.currentWorkHours.length > 11) {
            fieldsErrors.push('Current work hours field length 11 characters max');
        }
        if (data.hourRate && data.hourRate.length > 11) {
            fieldsErrors.push('Hour rate field length 11 characters max');
        }
        if (data.dayRate && data.dayRate.length > 11) {
            fieldsErrors.push('Day rate field length 11 characters max');
        }
        if (data.weekRate && data.weekRate.length > 11) {
            fieldsErrors.push('Week rate field length 11 characters max');
        }

        if (fieldsErrors.length) {
            return {
                status: 'error',
                code: '10024',
                errors: fieldsErrors,
            };
        }

        return false;
    }

    static apiValidateCreateHandlerFields(data) {
        if (!data.title || !data.type || !data.purchasingPrice || !data.marketPrice
            || !data.serialNumber || !data.hourRate || !data.dayRate || !data.weekRate || !data.currentWorkHours
            // || !data.maintenanceWorkHours || !data.maintenanceCost || !data.maintenanceDesc
        ) {
            let fieldsErrors = [];

            if (!data.title) {
                fieldsErrors.push('Equipment title field missing');
            }
            if (!data.type) {
                fieldsErrors.push('Type field missing');
            }
            if (!data.purchasingPrice) {
                fieldsErrors.push('Purchasing price field missing');
            }
            if (!data.marketPrice) {
                fieldsErrors.push('Market price field missing');
            }
            if (!data.serialNumber) {
                fieldsErrors.push('Serial number field missing');
            }
            if (!data.hourRate) {
                fieldsErrors.push('Hour rate field missing');
            }
            if (!data.dayRate) {
                fieldsErrors.push('Day rate field missing');
            }
            if (!data.weekRate) {
                fieldsErrors.push('Week rate field missing');
            }
            if (!data.currentWorkHours) {
                fieldsErrors.push('Current work hours field missing');
            }

            return {
                status: 'error',
                code: '10019',
                errors: fieldsErrors,
            };
        }

        if (data.title.length > 255 || data.type.length > 128 || data.purchasingPrice.length > 20
            || data.marketPrice.length > 20 || data.serialNumber.length > 255 || data.hourRate.length > 11
            || data.dayRate.length > 11 || data.weekRate.length > 11 || data.currentWorkHours.length > 11
        ) {
            let fieldsErrors2 = [];
            if (data.title.length > 255) {
                fieldsErrors2.push('Title field length 255 characters max');
            }
            if (data.type.length > 128) {
                fieldsErrors2.push('Type field length 255 characters max');
            }
            if (data.purchasingPrice.length > 20) {
                fieldsErrors2.push('Purchasing price field length 20 characters max');
            }
            if (data.marketPrice.length > 20) {
                fieldsErrors2.push('Market price field length 20 characters max');
            }
            if (data.serialNumber.length > 255) {
                fieldsErrors2.push('Serial number field length 512 characters max');
            }
            if (data.currentWorkHours.length > 11) {
                fieldsErrors2.push('Current work hours field length 11 characters max');
            }
            if (data.hourRate.length > 11) {
                fieldsErrors2.push('Hour rate field length 11 characters max');
            }
            if (data.dayRate.length > 11) {
                fieldsErrors2.push('Day rate field length 11 characters max');
            }
            if (data.weekRate.length > 11) {
                fieldsErrors2.push('Week rate field length 11 characters max');
            }
            return {
                status: 'error',
                code: '10020',
                errors: fieldsErrors2,
            };
        }
        return false;
    }
};