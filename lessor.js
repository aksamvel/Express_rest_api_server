let mysqlRequests = require('./mysqlRequests')(null);
let Logger = require('./logger');

module.exports = class Lessor {

    static apiGetListHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            mysqlRequests.requestLessors()
                .then(function (data) {
                    resolve(data)
                });
        });
    }

    static apiGetSingleHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.lessor) {
                return reject({
                    status: 'error',
                    code: '10017',
                    errors: ['Lessor id missing'],
                });
            }

            mysqlRequests.requestLessor(params.lessor, authedUser.role)
                .then(function (data) {
                    resolve(data)
                });
        });
    }

    static apiDeleteHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.lessor) {
                return reject({
                    status: 'error',
                    code: '10017',
                    errors: ['Lessor id missing'],
                });
            }

            mysqlRequests.removeEqupment(params.lessor)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Lessor delete', entityType: 'lessor', entityAction: 'delete', entityId: params.lessor});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiCreateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            let errorData = Lessor.apiValidateCreateHandlerFields(body);
            if (errorData) {
                return reject(errorData)
            }

            let lessor = {
                firstName: body.firstName,
                lastName: body.lastName,
                company: body.company ? body.company : '',
                birthDate: body.birthDate,
                passNumber: body.passNumber,
                post: body.post,
                city: body.city,
                address: body.address,
                mail: body.mail,
                phone: body.phone,
                trustLevel: body.trustLevel,
            }

            let photo = '';
            if (files && files.photo) {
                let photoFile = files.photo.pop();
                photo = photoFile.path;
            }


            let passCopy = '';
            if (files && files.passCopy) {
                let passCopyFile = files.passCopy.pop();
                passCopy = passCopyFile.path;
            }

            mysqlRequests.createLessor(lessor, photo, passCopy)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Lessor create', entityType: 'lessor', entityAction: 'create', entityId: data.data.lessorId});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiUpdateHandler (params, body, files, authedUser) {
        return new Promise((resolve, reject) => {
            if (!params.lessor) {
                return reject({
                    status: 'error',
                    code: '10017',
                    errors: ['Lessor id missing'],
                });
            }

            let errorData = Lessor.apiValidateCreateHandlerFields(body);
            if (errorData) {
                return reject(errorData)
            }

            let lessor = {
                firstName: body.firstName,
                lastName: body.lastName,
                company: body.company ? body.company : '',
                birthDate: body.birthDate,
                passNumber: body.passNumber,
                post: body.post,
                city: body.city,
                address: body.address,
                mail: body.mail,
                phone: body.phone,
                trustLevel: body.trustLevel,
            }

            if (files && files.photo) {
                let photoFile = files.photo.pop();
                console.log(photoFile);
                lessor.photo = photoFile.path;
            }
            else if (body.photo) {
                lessor.photo = body.photo;
            }
            else {
                lessor.photo = '';
            }

            if (files && files.passCopy) {
                let passCopyFile = files.passCopy.pop();
                lessor.passCopy = passCopyFile.path;
            }
            else if (body.passCopy) {
                lessor.passCopy = body.passCopy;
            }
            else {
                lessor.passCopy = '';
            }

            mysqlRequests.updateLessor(lessor, params.lessor)
                .then(function (data) {
                    Logger.log(authedUser, {type: 'entity_log', message: 'Lessor update', entityType: 'lessor', entityAction: 'update', entityId: params.lessor});
                    resolve(data)
                })
                .catch(function (data) {
                    reject(data)
                });
        });
    }

    static apiValidateCreateHandlerFields(data) {
        if (!data.firstName || !data.lastName || !data.birthDate || !data.address
          || !data.mail || !data.passNumber || !data.trustLevel // || !data.photo || !data.passCopy
        ) {
            let fieldsErrors = [];

            if (!data.firstName) {
                fieldsErrors.push('First name field missing');
            }
            if (!data.lastName) {
                fieldsErrors.push('Last name field missing');
            }
            if (!data.birthDate) {
                fieldsErrors.push('Birth date field missing');
            }
            if (!data.address) {
                fieldsErrors.push('Address field missing');
            }
            if (!data.mail) {
                fieldsErrors.push('Mail field missing');
            }
            if (!data.phone) {
                fieldsErrors.push('Phone field missing');
            }
            if (!data.post) {
                fieldsErrors.push('Post field missing');
            }
            if (!data.city) {
                fieldsErrors.push('City field missing');
            }
            if (!data.passNumber) {
                fieldsErrors.push('Passport number field missing');
            }
            if (!data.trustLevel) {
                fieldsErrors.push('Trust level field missing');
            }

            return {
                status: 'error',
                code: '10013',
                errors: fieldsErrors,
            };
        }

        if (data.firstName.length > 255 || data.lastName.length > 255|| data.birthDate.length > 20
            || data.address.length > 512 || data.mail.length > 128 || data.passNumber.length > 128
            || data.post.length > 128 || data.city.length > 128 || data.phone.length > 128
        ) {
            let fieldsErrors2 = [];
            if (data.firstName.length > 255) {
                fieldsErrors2.push('First name field length 255 characters max');
            }
            if (data.lastName.length > 255) {
                fieldsErrors2.push('Last name field length 255 characters max');
            }
            if (data.birthDate.length > 20) {
                fieldsErrors2.push('Birth date field length 20 characters max (timestamp in microseconds)');
            }
            if (data.address.length > 512) {
                fieldsErrors2.push('Address field length 512 characters max');
            }
            if (data.mail.length > 128) {
                fieldsErrors2.push('Mail field length 128 characters max');
            }
            if (data.post.length > 128) {
                fieldsErrors2.push('Post field length 128 characters max');
            }
            if (data.city.length > 128) {
                fieldsErrors2.push('City field length 128 characters max');
            }
            if (data.phone.length > 128) {
                fieldsErrors2.push('Phone field length 128 characters max');
            }
            if (data.passNumber.length > 128) {
                fieldsErrors2.push('Pass number field length 128 characters max');
            }
            return {
                status: 'error',
                code: '10015',
                errors: fieldsErrors2,
            };
        }
        return false;
    }
};