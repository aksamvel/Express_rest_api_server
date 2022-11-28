let mysqlDB = require('./mysqlDB');
const fs = require("fs");
const sha1 = require("sha1");
let states = require('./states');
const e = require("express");

module.exports = function (io) {
    let module = {};

    module.findUserByAuth = function (username, password) {
        return new Promise((resolve, reject) => {
            let hashedPass = sha1(password);
            connection.query("SELECT u.* FROM users u WHERE u.username=? AND u.password=? ORDER BY created DESC",
                [username, hashedPass],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.findUserByAuth(username, password)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve({
                                  status: 'error',
                                  code: '00001',
                                  errors: ['Internal error'],
                              });
                          });
                    }
                    else {
                        if (results.length > 0) {
                            let user =  results.pop();
                            resolve({
                                status: 'success',
                                data: {
                                    user: user,
                                    token: sha1(user.password + ':' + user.username),
                                }
                            });
                        }
                        else {
                            resolve ({
                                status: 'error',
                                code: '10001',
                                errors: ['Username or password invalid'],
                            });
                        }
                    }
                });
        });
    }

    module.checkAuth = function (appauth) {
        return new Promise((resolve, reject) => {
            connection.query("SELECT u.* FROM users u WHERE SHA1(CONCAT(u.password, ':', u.username))=?",
                [appauth],
                function (err, results, fields) {
                    if (err) {
                        console.log(err);
                        handleMysqlTimeoutError(err)
                        .then(function() {
                            module.checkAuth(appauth)
                              .then(function(resolveResults){
                                resolve(resolveResults);
                            }).catch(function(err) {
                                reject(err);
                            });
                        })
                        .catch(function (err) {
                            console.log('err', err)
                        });
                        //
                        // reject({
                        //     status: 'error',
                        //     code: '00002',
                        //     errors: ['Internal error'],
                        // });
                    }
                    else {
                        if (results.length > 0) {
                            resolve(results.pop());
                        }
                        else {
                            reject({
                                status: 'error',
                                code: '10004',
                                errors: ['Token invalid'],
                            });
                        }
                    }
                });

        });
    }

    module.requestUsers = function () {
        return new Promise((resolve, reject) => {
            connection.query("SELECT u.* FROM users u ORDER BY created DESC",
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function() {
                              module.requestUsers()
                                .then(function(resolveResults){
                                    resolve(resolveResults);
                                }).catch(function(err) {
                                  reject(err);
                              });
                          })
                          .catch(function(err) {
                              console.log(err)
                              resolve ({
                                  status: 'error',
                                  code: '00003',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);

                    }
                    else {
                        resolve ({
                            status: 'success',
                            data: results,
                        });
                    }
                });
        });
    }

    module.removeUser = function (userId) {
        return new Promise((resolve, reject) => {
            connection.query("DELETE FROM users WHERE id=?",
                [userId],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.removeUser(userId)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '00004',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                    }
                    else {
                        resolve ({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                });
        });
    }

    module.createUser = function (user) {
        return new Promise((resolve, reject) => {
            let date_ob = new Date();
            let password = sha1(user.password);
            let sql = "INSERT INTO users (username, password, role, created) VALUES ?";
            connection.query(sql, [[[user.username, password, user.role, date_ob.getTime()]]], function (err, insertResult) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.createUser(user)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000051',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        reject({
                            status: 'error',
                            code: '10009',
                            errors: ['Username ' + "'" + user.username + "' already exist"],
                        });
                    }
                    else {
                        reject({
                            status: 'error',
                            code: '00005',
                            errors: ['Internal error'],
                        })
                    }
                }
                else {
                    resolve({
                        status: 'success',
                        data: {
                            userId: insertResult.insertId,
                        },
                    })
                }
            });
        });
    }

    module.updateUser = function (user, userId) {
        return new Promise((resolve, reject) => {
            let sql = '';
            let params = [];
            if (user.password !== undefined) {
                sql = "UPDATE users SET username=?, role=?, password=? WHERE id=?";
                params = [user.username, user.role, sha1(user.password), userId];
            }
            else {
                sql = "UPDATE users SET username=?, role=? WHERE id=?";
                params = [user.username, user.role, userId];
            }

            connection.query(sql, params, function (err, results) {
                if (err) {

                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.updateUser(user, userId)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000061',
                              errors: ['Internal error'],
                          });
                      });

                    console.log(err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        reject({
                            status: 'error',
                            code: '10009',
                            errors: ['Username ' + "'" + user.username + "' already exist"],
                        });
                    }
                    else {
                        reject({
                            status: 'error',
                            code: '00006',
                            errors: ['Internal error'],
                        })
                    }
                }
                else {
                    if (results.affectedRows > 0) {
                        resolve({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                    else {
                        reject({
                            status: 'error',
                            code: '10011',
                            errors: ['user does not exist'],
                        });
                    }
                }
            });
        });
    }

    module.createLessor = function (lessor, photo='', passCopy='') {
        return new Promise((resolve, reject) => {
            let date_ob = new Date();
            let params = [
                lessor.firstName,
                lessor.lastName,
                lessor.company,
                lessor.birthDate,
                lessor.passNumber,
                lessor.post,
                lessor.city,
                lessor.address,
                lessor.mail,
                lessor.phone,
                lessor.trustLevel,
                photo,
                passCopy,
                date_ob.getTime(),
            ];

            let sql = "INSERT INTO lessors (first_name, last_name, company, birth_date, pass_number, post_code, city, address, mail, phone, trust_level, photo, pass_copy, created) VALUES ?";
            connection.query(sql, [[params]], function (err, insertResult) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.createLessor(lessor, photo, passCopy)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000071',
                              errors: ['Internal error'],
                          });
                      });

                    console.log(err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        reject({
                            status: 'error',
                            code: '10016',
                            errors: ['Lessor passport number ' + "'" + lessor.passNumber + "' already exist in database"],
                        });
                    }
                    else {
                        reject({
                            status: 'error',
                            code: '00007',
                            errors: ['Internal error'],
                        });
                    }
                }
                else {
                    resolve({
                        status: 'success',
                        data: {
                            lessorId: insertResult.insertId,
                        },
                    });
                }
            });
        });
    }

    module.updateLessor = function (lessor, lessorId) {
        return new Promise((resolve, reject) => {
            let sql = "UPDATE lessors SET first_name=?, last_name=?, company=?, birth_date=?, pass_number=?, post_code=?, city=?, address=?, mail=?, phone=?, trust_level=?, photo=?, pass_copy=? WHERE id=?";
            let params = [lessor.firstName, lessor.lastName, lessor.company, lessor.birthDate, lessor.passNumber,
                lessor.post, lessor.city, lessor.address, lessor.mail, lessor.phone, lessor.trustLevel, lessor.photo, lessor.passCopy, lessorId];
            connection.query(sql, params, function (err, results) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.updateLessor(lessor, lessorId)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000081',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        reject({
                            status: 'error',
                            code: '10016',
                            errors: ['Lessor passport number ' + "'" + lessor.passNumber + "' already exist in database"],
                        });
                    }
                    else {
                        reject({
                            status: 'error',
                            code: '00008',
                            errors: ['Internal error'],
                        });
                    }
                }
                else {
                    if (results.affectedRows > 0) {
                        resolve({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                    else {
                        resolve({
                            status: 'error',
                            code: '10018',
                            errors: ['Lessor does not exist'],
                        });
                    }
                }
            });
        });
    }

    module.removeLessor = function (lessorId) {
        return new Promise((resolve, reject) => {
            connection.query("DELETE FROM lessors WHERE id=?",
                [lessorId],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.removeLessor(lessorId)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000091',
                                  errors: ['Internal error'],
                              });
                          });

                        console.log(err);
                        resolve ({
                            status: 'error',
                            code: '00009',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        resolve ({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                });
        });
    }

    module.requestLessors = function () {
        return new Promise((resolve, reject) => {
            connection.query("SELECT l.*, COUNT(c.id) as contracts FROM lessors l LEFT JOIN contracts c ON c.lessor_id = l.id GROUP BY l.id ORDER BY created DESC",
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.requestLessors()
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000101',
                                  errors: ['Internal error'],
                              });
                          });

                        console.log(err);
                        resolve ({
                            status: 'error',
                            code: '00010',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        if (results.length > 0) {
                            // results
                            let data = [];
                            results.forEach((element) => {
                                data.push({
                                    id: element.id,
                                    firstName: element.first_name,
                                    lastName: element.last_name,
                                    company: element.company,
                                    birthDate: element.birth_date,
                                    passNumber: element.pass_number,
                                    post: element.post_code,
                                    city: element.city,
                                    address: element.address,
                                    mail: element.mail,
                                    phone: element.phone,
                                    trustLevel: element.trust_level,
                                    photo: element.photo,
                                    passCopy: element.pass_copy,
                                    created: element.created,
                                    contractsNumber: element.contracts,
                                });
                            })
                            resolve ({
                                status: 'success',
                                data: data,
                            });
                        }
                        else {
                            resolve ({
                                status: 'success',
                                data: [],
                            });
                        }
                    }
                });
        });
    }

    module.requestLessor = function (lessorId, role) {
        return new Promise((resolve, reject) => {
            connection.query("SELECT l.* FROM lessors l WHERE l.id=?",
                [lessorId],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.requestLessor(lessorId)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000111',
                                  errors: ['Internal error'],
                              });
                          });

                        console.log(err);
                        resolve ({
                            status: 'error',
                            code: '00011',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        if (results.length > 0) {
                            let res = results.pop();
                            module.requestLessorsContracts([res.id], false)
                              .then(function(contracts) {
                                  console.log(process.env.CURRENT_DOMAIN);

                                  let lessor = {
                                      id: res.id,
                                      firstName: res.first_name,
                                      lastName: res.last_name,
                                      company: res.company,
                                      birthDate: res.birth_date,
                                      passNumber: res.pass_number,
                                      post: res.post_code,
                                      city: res.city,
                                      address: res.address,
                                      mail: res.mail,
                                      phone: res.phone,
                                      trustLevel: res.trust_level,
                                      photo: res.photo,
                                      passCopy: res.pass_copy,
                                      created: res.created,
                                      contracts: [],
                                  };
                                  if (contracts.length) {
                                      contracts.forEach((element) => {
                                          let item = {
                                              contractNumber: element.id,
                                              startDate: element.date_start,
                                              endDate: element.date_end,
                                          };

                                          if (role === 'administrator') {
                                              item.amount = element.sum / 100; // To euros
                                          }

                                          lessor.contracts.push(item);
                                      });
                                  }

                                  resolve({
                                      status: 'success',
                                      data: lessor,
                                  });
                              });

                        }
                        else {
                            resolve({
                                status: 'error',
                                code: '10018',
                                errors: ['Lessor does not exist'],
                            });
                        }
                    }
                });
        });
    }

    module.createEquipment = function (equipment, photo='') {
        return new Promise((resolve, reject) => {
            let date_ob = new Date();

            let params = [
                equipment.title,
                equipment.type,
                equipment.purchasingPrice * 100, // To cents.
                equipment.marketPrice * 100, // To cents.
                equipment.serialNumber,
                equipment.currentWorkHours,
                equipment.hourRate * 100, // To cents.
                equipment.dayRate  * 100, // To cents.
                equipment.weekRate  * 100, // To cents.
                photo,
                date_ob.getTime(),
            ];

            let sql = "INSERT INTO equipments (title, type, purchase_price, market_price, serial_number, work_hours, hour_rate, day_rate, week_rate, photo,  created) VALUES ?";
            connection.query(sql, [[params]], function (err, insertResult) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.createEquipment(equipment, photo)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000121',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        reject({
                            status: 'error',
                            code: '10021',
                            errors: ['Equipment serial number ' + "'" + equipment.serialNumber + "' already exist in database"],
                        });
                    }
                    else {
                        reject({
                            status: 'error',
                            code: '00012',
                            errors: ['Internal error'],
                        });
                    }
                }
                else {

                    resolve({
                        status: 'success',
                        data: {
                            equipmentId: insertResult.insertId,
                        },
                    });
                }
            });
        });
    }

    module.requestEquipmentsContracts = function(equipmentIds, active = true) {
        return new Promise((resolve, reject) => {
            let sql = "SELECT c.*, l.first_name, l.last_name FROM contracts c " +
                "LEFT JOIN lessors l ON l.id = c.lessor_id WHERE c.equipment_id IN ('" + equipmentIds.join("','") + "')";

            if (active) {
                sql += "&& c.status = 'started'"
            }
            connection.query(sql,function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.requestEquipmentsContracts(equipmentIds)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000122',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        resolve ([]);
                    }
                    else {
                        resolve (results);
                    }
                });
        });
    }

    module.requestLessorsContracts = function(lessorIds, active = true) {
        return new Promise((resolve, reject) => {
            let sql = "SELECT c.*, l.first_name, l.last_name FROM contracts c " +
              "JOIN lessors l ON l.id = c.lessor_id WHERE l.id IN ('" + lessorIds.join("','") + "')";

            if (active) {
                sql += "&& c.status = 'started'"
            }
            connection.query(sql,function(err, results, fields) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.requestLessorsContracts(lessorIds)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000123',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    resolve ([]);
                }
                else {
                    resolve (results);
                }
            });
        });
    }

    module.requestEquipmentsMaintenances = function(equipmentIds) {
        return new Promise((resolve, reject) => {
            connection.query("SELECT m.* FROM maintenance m " +
                "WHERE m.equipment_id IN ('" + equipmentIds.join("','") + "') ORDER BY m.date DESC",
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.requestEquipmentsMaintenances(equipmentIds)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000124',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        resolve ([]);
                    }
                    else {
                        resolve (results);
                    }
                });
        });
    }

    module.equipmentsSum = function(equipmentIds) {
        return new Promise((resolve, reject) => {
            let processedData = {};
            connection.query("SELECT e.id, m.id as maintenance, m.cost as m_sum, c.id as contract, c.sum as c_sum, s.id as service, s.sum as s_sum FROM equipments e LEFT JOIN maintenance m ON m.equipment_id=e.id LEFT JOIN contracts c ON c.equipment_id=e.id LEFT JOIN services s ON s.contract_id=c.id WHERE e.id IN ('" + equipmentIds.join("','") + "')",
                // ["'" + equipmentIds.join("', '") + "'"],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.equipmentsSum(equipmentIds)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000125',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                    }
                    else {
                        if (results.length > 0) {
                            let data = {};
                            results.forEach((element) => {
                                if (data[element.id] === undefined && element.id) {
                                    data[element.id] = {contracts: {}, maintenances: {}, services: {}};
                                }
                                if (data[element.id].contracts[element.contract] === undefined && element.contract) {
                                    data[element.id].contracts[element.contract] = 0;
                                }
                                if (data[element.id].maintenances[element.maintenance] === undefined && element.maintenance) {
                                    data[element.id].maintenances[element.maintenance] = 0;
                                }
                                if (data[element.id].services[element.service] === undefined && element.service) {
                                    data[element.id].services[element.service] = 0;
                                }
                                if (element.contract) {
                                    data[element.id].contracts[element.contract] = parseInt(element.c_sum);
                                }
                                if (element.maintenance) {
                                    data[element.id].maintenances[element.maintenance] = parseInt(element.m_sum);
                                }
                                if (element.service) {
                                    data[element.id].services[element.service] = parseInt(element.s_sum);
                                }
                            });
                            for (let prop in data) {
                                processedData[prop] = {
                                    c_sum: Object.values(data[prop].contracts).reduce((a, b) => a + b, 0),
                                    m_sum: Object.values(data[prop].maintenances).reduce((a, b) => a + b, 0),
                                    s_sum: Object.values(data[prop].services).reduce((a, b) => a + b, 0),
                                };
                            }
                        }
                    }
                    resolve(processedData);
                });
        });
    }

    module.requestEquipments = function (role) {
        return new Promise((resolve, reject) => {
            connection.query("SELECT e.* FROM equipments e ORDER BY created DESC",
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.requestEquipments(role)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000131',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        resolve ({
                            status: 'error',
                            code: '00013',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        if (results.length > 0) {
                            // Запрашиваем суммы
                            let equipmentIds = [];
                            results.forEach((element) => {
                                equipmentIds.push(element.id);
                            });
                            module.equipmentsSum(equipmentIds)
                                .then(function(equipmentsSum) {

                                    // request status.
                                    module.requestEquipmentsContracts(equipmentIds)
                                        .then(function(activeContracts) {


                                            // request status.
                                            module.requestEquipmentsMaintenances(equipmentIds)
                                                .then(function(maintenances) {
                                                    // results
                                                    let data = [];
                                                    results.forEach((element) => {
                                                        let pastEquipmentMaintenances = maintenances.filter(obj => {
                                                            return obj.equipment_id === element.id && obj.date !== null;
                                                        });

                                                        let item = {
                                                            id: element.id,
                                                            title: element.title,
                                                            type: element.type,
                                                            photo: element.photo,
                                                            status: module.equipmentStatus(activeContracts, element.id)
                                                        };
                                                        if (pastEquipmentMaintenances.length) {
                                                            // они отсортированы по дате, берем первую, она самая поздняя.
                                                            let maintenanceDate = pastEquipmentMaintenances.shift();
                                                            item.maintenanceDate = maintenanceDate.date;

                                                            let futureEquipmentMaintenances = maintenances.filter(obj => {
                                                                return obj.equipment_id === element.id && obj.date === null;
                                                            });
                                                            if (futureEquipmentMaintenances.length) {
                                                                let futureEquipmentMaintenance = futureEquipmentMaintenances.pop();
                                                                let workHoursDiff = futureEquipmentMaintenance.work_hours - element.work_hours;
                                                                if (workHoursDiff < 0) {
                                                                    item.maintenanceStatus = 'danger';
                                                                }
                                                                else if (workHoursDiff < 20) {
                                                                    item.maintenanceStatus = 'warning';
                                                                }
                                                                else {
                                                                    item.maintenanceStatus = 'normal';
                                                                }
                                                            }
                                                            else {
                                                                item.maintenanceStatus = 'normal';
                                                            }
                                                        }
                                                        else {
                                                            item.maintenanceDate = '';
                                                            item.maintenanceStatus = 'normal';
                                                        }

                                                        if (role === 'administrator') {
                                                            // Сумма в списке техники должна выводить что?
                                                            // Сделаем пока сумму контрактов + сумма доп услуг - сумму прошедших тех обслуживаний
                                                            item.proceeds = (equipmentsSum[element.id].c_sum + equipmentsSum[element.id].s_sum - equipmentsSum[element.id].m_sum) / 100; // To euros
                                                        }

                                                        data.push(item);
                                                    });
                                                    resolve ({
                                                        status: 'success',
                                                        data: data,
                                                    });
                                                });
                                        });

                                });
                        }
                        else {
                            resolve ({
                                status: 'success',
                                data: [],
                            });
                        }
                    }
                });
        });
    }

    module.equipmentStatus = function (activeContracts, equipmentId) {
        let isActive = activeContracts.filter(obj => {
            return obj.equipment_id === equipmentId && obj.status === 'started';
        })

        if (isActive.length) {
            let contract = isActive.pop();
            return  {
                state: 'active_contract',
                contract: {
                    id: contract.id
                },
                lessor: {
                    id: contract.lessor_id,
                    name: contract.first_name + ' ' + contract.last_name,
                }
            };
        }
        else {
            return {
                state: 'idle'
            };
        }
    }

    module.requestEquipmentsWithContracts = function (role) {
        return new Promise((resolve, reject) => {
            // Get the previous Monday
            let monday = new Date();
            monday.setHours(monday.getHours() - monday.getUTCHours(),0,0,0);
            monday.setDate(monday.getDate() - monday.getDay() + 1);
            let time = monday.getTime();

            connection.query("" +
                "SELECT e.*, c.id AS contract_id, c.date_start, c.date_end, c.lessor_id  FROM equipments e " +
                "LEFT JOIN contracts c ON c.equipment_id = e.id AND c.date_end > ? AND c.status != 'canceled' ORDER BY created DESC",
                [time],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.requestEquipmentsWithContracts(role)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000141',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        resolve ({
                            status: 'error',
                            code: '00014',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        if (results.length > 0) {
                            let equipmentIds = [];
                            results.forEach((element) => {
                                equipmentIds.push(element.id);
                            });

                            module.requestEquipmentsContracts(equipmentIds)
                                .then(function(activeContracts) {
                                    // results
                                    let data = {};
                                    results.forEach((element) => {
                                        if (!data[element.id]) {
                                            data[element.id] = {
                                                id: element.id,
                                                title: element.title,
                                                type: element.type,
                                                status: module.equipmentStatus(activeContracts, element.id),
                                                rates: {
                                                    hourRate: element.hour_rate,
                                                    dayRate: element.day_rate,
                                                    weekRate: element.week_rate,
                                                },
                                                photo: element.photo,
                                                contracts: [],
                                            };


                                        }

                                        if (element.contract_id) {
                                            data[element.id].contracts.push({
                                                id: element.contract_id,
                                                startDate: element.date_start,
                                                endDate: element.date_end,
                                                lessorId: element.lessor_id,
                                            });
                                        }
                                    })
                                    resolve ({
                                        status: 'success',
                                        data: Object.values(data),
                                    });
                                });
                        }
                        else {
                            resolve ({
                                status: 'success',
                                data: [],
                            });
                        }
                    }
                });
        });
    }

    module.requestEquipment = function (equipmentId, role) {
        return new Promise((resolve, reject) => {
            connection.query("SELECT e.* FROM equipments e WHERE e.id=?",
                [equipmentId],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.requestEquipment(equipmentId, role)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000151',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        resolve ({
                            status: 'error',
                            code: '00015',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        if (results.length > 0) {
                            let res = results.pop();
                            module.requestEquipmentsContracts([res.id], false)
                                .then(function(contracts) {
                                    let equipment = {
                                        id: res.id,
                                        title: res.title,
                                        type: res.type,
                                        serialNumber: res.serial_number,
                                        currentWorkHours: res.work_hours,
                                        hourRate:  res.hour_rate / 100, // From cents to euros.
                                        dayRate: res.day_rate / 100, // From cents to euros.
                                        weekRate: res.week_rate / 100, // From cents to euros.
                                        status: module.equipmentStatus(contracts, res.id),
                                        contracts: [],
                                        photo: res.photo,
                                    };

                                    if (contracts.length) {
                                        contracts.forEach((element) => {
                                            equipment.contracts.push(
                                                {
                                                    lessor: {
                                                        id: element.lessor_id,
                                                        name: element.first_name + ' ' + element.last_name,
                                                    },
                                                    contractNumber: element.id,
                                                    amount: element.sum / 100, // to euros.,
                                                    startDate: element.date_start,
                                                    endDate: element.date_end,
                                                }
                                            );
                                        });
                                    }

                                    if (role === 'administrator') {
                                        equipment.proceeds = 1000; // @todo need calculate
                                        equipment.balance = -10000; // @todo need calculate
                                        equipment.purchasingPrice = res.purchase_price / 100; // From cents to euros.
                                        equipment.marketPrice = res.market_price / 100; // From cents to euros.
                                    }

                                    resolve({
                                        status: 'success',
                                        data: equipment,
                                    });
                                });
                        }
                        else {
                            resolve({
                                status: 'error',
                                code: '10023',
                                errors: ['Equipment does not exist'],
                            });
                        }
                    }
                });
        });
    }

    module.removeEqupment = function (equipmentId) {
        return new Promise((resolve, reject) => {
            connection.query("DELETE FROM equipments WHERE id=?",
                [equipmentId],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.removeEqupment(equipmentId)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000161',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        reject({
                            status: 'error',
                            code: '00016',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        resolve ({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                });
        });
    }

    module.updateEquipment = function (data, equipmentId, photo = null) {
        return new Promise((resolve, reject) => {
            let updateFields = [];
            let params = [];

            if (photo || photo === '') {
                updateFields.push('photo=?');
                params.push(photo);
            }

            let fieldNames = [
                {camelName: 'title', sqlName: 'title'},
                {camelName: 'type', sqlName: 'type'},
                {camelName: 'serialNumber', sqlName: 'serial_number'},
                {camelName: 'purchasingPrice', sqlName: 'purchase_price'},
                {camelName: 'marketPrice', sqlName: 'market_price'},
                {camelName: 'currentWorkHours', sqlName: 'work_hours'},
                {camelName: 'hourRate', sqlName: 'hour_rate'},
                {camelName: 'dayRate', sqlName: 'day_rate'},
                {camelName: 'weekRate', sqlName: 'week_rate'},
            ];

            fieldNames.forEach((element) => {
                if (data[element.camelName] || data[element.camelName] ==='') {
                    updateFields.push(element.sqlName + '=?');
                    if (['purchase_price', 'market_price', 'hour_rate', 'day_rate', 'week_rate'].includes(element.sqlName)) {
                        // Prices we store in cents.
                        params.push(data[element.camelName] * 100);
                    }
                    else {
                        params.push(data[element.camelName]);
                    }
                }
            });

            let sql = "UPDATE equipments SET " + updateFields.join(', ') + " WHERE id=?";
            params.push(equipmentId);

            connection.query(sql, params, function (err, results) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.updateEquipment(data, equipmentId, photo)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000171',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        reject({
                            status: 'error',
                            code: '10021',
                            errors: ['Equipment serial number ' + "'" + equipment.serialNumber + "' already exist in database"],
                        });
                    }
                    else {
                        reject({
                            status: 'error',
                            code: '00017',
                            errors: ['Internal error'],
                        });
                    }
                }
                else {
                    if (results.affectedRows > 0) {
                        resolve({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                    else {
                        reject({
                            status: 'error',
                            code: '10023',
                            errors: ['Equipment does not exist'],
                        });
                    }
                }
            });
        });
    }

    module.createLog = function (log) {
        let date_ob = new Date();
        let params = [];
        let sql = '';
        if (log.type === 'entity_log') {
            params = [
                log.type,
                log.message,
                log.entityId,
                log.entityType,
                log.entityAction,
                log.authorId,
                log.username,
                date_ob.getTime()
            ];
            sql = "INSERT INTO logs (type, message, entity_id, entity_type, entity_action, author_id, username, created) VALUES ?";
        }
        else {
            params = [
                log.type,
                log.message,
                log.authorId,
                log.username,
                date_ob.getTime()
            ];
            sql = "INSERT INTO logs (type, message, author_id, username, created) VALUES ?";
        }

        connection.query(sql, [[params]], function (err, insertResult) {
            if (err) {
                handleMysqlTimeoutError(err)
                  .then(function () {
                      module.createLog(log);
                  })
                  .catch(function (err) {
                      console.log(err);
                      resolve ({
                          status: 'error',
                          code: '000171',
                          errors: ['Internal error'],
                      });
                  });
                console.log(err);
            }
        });
    }

    module.createMaintenance = function (maintenance) {
        return new Promise((resolve, reject) => {
            let date_ob = new Date();

            let params = [
                maintenance.equipmentId,
                maintenance.date,
                maintenance.cost * 100, // To cents.
                maintenance.description,
                maintenance.workHours,
                date_ob.getTime(),
            ];

            let sql = "INSERT INTO maintenance (equipment_id, date, cost, description, work_hours,  created) VALUES ?";
            connection.query(sql, [[params]], function (err, insertResult) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.createMaintenance(maintenance)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000181',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    reject({
                        status: 'error',
                        code: '00018',
                        errors: ['Internal error'],
                    });
                }
                else {
                    resolve({
                        status: 'success',
                        data: {
                            maintenanceId: insertResult.insertId,
                        },
                    });
                }
            });
        });
    }

    module.requestMaintenances = function (role, equipmentId = null) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT m.* FROM maintenance m ORDER BY created DESC';
            let params = [];
            if (equipmentId) {
                sql = 'SELECT m.*, e.work_hours as eq_wh FROM maintenance m JOIN equipments e ON e.id = m.equipment_id WHERE m.equipment_id = ? ORDER BY created DESC';
                params = [equipmentId];
            }
            connection.query(sql, params,function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.requestMaintenances(role, equipmentId)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000191',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        resolve ({
                            status: 'error',
                            code: '00019',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        if (results.length > 0) {
                            // results
                            let data = [];
                            results.forEach((element) => {
                                let item = {
                                    id: element.id,
                                    equipmentId: element.equipment_id,
                                    date: element.date,
                                    description: element.description,
                                    workHours: element.work_hours,
                                    status: 'normal',
                                };

                                // Статусы обслуживания только у запланированных обслуживаний.
                                if (item.date === null) {
                                    let whDiff = element.work_hours - element.eq_wh;
                                    if (whDiff < 0) {
                                        item.status = 'danger';
                                    }
                                    else if (whDiff < 20) {
                                        item.status  = 'warning';
                                    }
                                }

                                if (role === 'administrator') {
                                    item.cost = element.cost / 100;  // To euros.
                                }

                                data.push(item);
                            })
                            resolve ({
                                status: 'success',
                                data: data,
                            });
                        }
                        else {
                            resolve ({
                                status: 'success',
                                data: [],
                            });
                        }
                    }
                });
        });
    }

    module.removeMaintenance = function (maintenanceId) {
        return new Promise((resolve, reject) => {
            connection.query("DELETE FROM maintenance WHERE id=?",
                [maintenanceId],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.removeMaintenance(maintenanceId)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000201',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        reject({
                            status: 'error',
                            code: '00020',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        resolve ({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                });
        });
    }

    module.updateMaintenance = function (data, maintenanceId) {
        return new Promise((resolve, reject) => {
            let params = [
                data.equipmentId,
                data.cost * 100,  // To cents.
                data.description,
                data.workHours]
            ;
            let sql = "UPDATE maintenance SET equipment_id=?, cost=?, description=?, work_hours=?";

            if (data.date) {
                sql += ', date=?';
                params.push(data.date);
            }

            sql += ' WHERE id=?';
            params.push(maintenanceId);

            connection.query(sql, params, function (err, results) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.updateMaintenance(data, maintenanceId)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000211',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    reject ({
                        status: 'error',
                        code: '00021',
                        errors: ['Internal error'],
                    });
                }
                else {
                    if (results.affectedRows > 0) {
                        resolve({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                    else {
                        reject({
                            status: 'error',
                            code: '10028',
                            errors: ['Maintenance does not exist'],
                        });
                    }
                }
            });
        });
    }

    module.createDefect = function (defect) {
        return new Promise((resolve, reject) => {
            let date_ob = new Date();

            let params = [
                defect.equipmentId,
                defect.description,
                defect.photo,
                defect.contractId,
                date_ob.getTime(),
            ];

            let sql = "INSERT INTO defects (equipment_id, description, photo, contract_id, created) VALUES ?";
            connection.query(sql, [[params]], function (err, insertResult) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.createDefect(defect)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000221',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    reject({
                        status: 'error',
                        code: '00022',
                        errors: ['Internal error'],
                    });
                }
                else {
                    resolve({
                        status: 'success',
                        data: {
                            defectId: insertResult.insertId,
                        },
                    });
                }
            });
        });
    }

    module.requestDefects = function (equipmentId = null) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT d.* FROM defects d ORDER BY created DESC';
            let params = [];
            if (equipmentId) {
                sql = 'SELECT d.* FROM defects d WHERE d.equipment_id = ? ORDER BY created DESC';
                params = [equipmentId];
            }
            connection.query(sql, params,function(err, results, fields) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.requestDefects(equipmentId)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000231',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    resolve ({
                        status: 'error',
                        code: '00023',
                        errors: ['Internal error'],
                    });
                }
                else {
                    if (results.length > 0) {
                        // results
                        resolve ({
                            status: 'success',
                            data: results,
                        });
                    }
                    else {
                        resolve ({
                            status: 'success',
                            data: [],
                        });
                    }
                }
            });
        });
    }

    module.updateDefect = function (data, defectId, photo = null) {
        return new Promise((resolve, reject) => {
            let params = [
                data.equipmentId,
                photo,
                data.description,
                defectId
            ];
            let sql = "UPDATE defects SET equipment_id=?, photo=?, description=? WHERE id=?";
            connection.query(sql, params, function (err, results) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.updateDefect(data, defectId, photo)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000241',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    reject ({
                        status: 'error',
                        code: '00024',
                        errors: ['Internal error'],
                    });
                }
                else {
                    if (results.affectedRows > 0) {
                        resolve({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                    else {
                        reject({
                            status: 'error',
                            code: '10038',
                            errors: ['Defect does not exist'],
                        });
                    }
                }
            });
        });
    }

    module.removeDefect = function (defectId) {
        return new Promise((resolve, reject) => {
            connection.query("DELETE FROM defects WHERE id=?",
                [defectId],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.removeDefect(defectId)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000251',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        reject({
                            status: 'error',
                            code: '00025',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        resolve ({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                });
        });
    }

    module.createContract = function (contract) {
        return new Promise((resolve, reject) => {
            let date_ob = new Date();
            let params = [
                contract.equipmentId,
                contract.lessorId,
                contract.dateStart,
                contract.dateEnd,
                contract.status,
                contract.sum * 100,  // To cents.
                date_ob.getTime(),
            ];

            let sql = "INSERT INTO contracts (equipment_id, lessor_id, date_start, date_end, status, sum, created) VALUES ?";
            connection.query(sql, [[params]], function (err, insertResult) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.createContract(contract)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000261',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    reject({
                        status: 'error',
                        code: '00026',
                        errors: ['Internal error'],
                    });
                }
                else {
                    resolve({
                        status: 'success',
                        data: {
                            contractId: insertResult.insertId,
                        },
                    });
                }
            });
        });
    }

    module.requestContracts = function (role) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT c.*, l.first_name, l.last_name, e.title FROM contracts c ' +
                'JOIN equipments e ON e.id = c.equipment_id JOIN lessors l ON l.id = c.lessor_id ORDER BY c.created DESC';
            let params = [];

            connection.query(sql, params,function(err, results, fields) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.requestContracts(role)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000271',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    resolve ({
                        status: 'error',
                        code: '00027',
                        errors: ['Internal error'],
                    });
                }
                else {
                    if (results.length > 0) {
                        // results

                        let data = [];
                        results.forEach((element) => {
                            let item = {
                                contractId: element.id,
                                equipmentId: element.equipment_id,
                                equipmentTitle: element.title,
                                lessorId: element.lessor_id,
                                lessorName: element.first_name + ' ' + element.last_name,
                                contractStartDate: element.date_start,
                                contractEndDate: element.date_end,
                                status: element.status,
                            };

                            if (element.sum) {
                                if (role === 'administrator') {
                                    item.sum = element.sum / 100;  // To euros.
                                }
                                // // We show price for operator only for current contracts.
                                // else if (role === 'operator' && element.status !== states.contractState.COMPLETED) {
                                //     item.sum = element.sum / 100;  // To euros.
                                // }
                            }

                            data.push(item);
                        })

                        resolve ({
                            status: 'success',
                            data: data,
                        });
                    }
                    else {
                        resolve ({
                            status: 'success',
                            data: [],
                        });
                    }
                }
            });
        });
    }

    module.requestContract = function (contractId, role) {
        return new Promise((resolve, reject) => {
            let sql = "SELECT c.*, e.title AS equipment_title, e.type as equipment_type, e.hour_rate, e.day_rate, l.first_name AS lessor_first_name, " +
              "l.last_name AS lessor_last_name, l.company, l.post_code, l.city, l.address, l.mail, l.pass_number, l.phone FROM contracts c " +
                "JOIN lessors l ON l.id = c.lessor_id JOIN equipments e ON e.id = c.equipment_id WHERE c.id=? ORDER BY c.created";
            connection.query(sql,
                [contractId],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.requestContract(contractId, role)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000281',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        resolve ({
                            status: 'error',
                            code: '00028',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        if (results.length > 0) {
                            let res = results.pop();
                            let contract = {
                                id: res.id,
                                equipment: {
                                    id: res.equipment_id,
                                    title: res.equipment_title,
                                    type: res.equipment_type,
                                    hourRate: res.hour_rate / 100, // to euros.
                                    dayRate: res.day_rate / 100, // to euros.
                                },
                                lessor: {
                                    id: res.lessor_id,
                                    name: res.lessor_first_name + ' ' + res.lessor_last_name,
                                    company: res.company,
                                    post: res.post_code,
                                    city: res.city,
                                    address: res.address,
                                    mail: res.mail,
                                    phone: res.phone,
                                    passNumber: res.pass_number,
                                },
                                status: res.status,
                                workAddress: res.work_address,
                                startDate: res.date_start,
                                endDate: res.date_end,
                                created: res.created,
                            };

                            if (res.status === states.contractState.COMPLETED) {
                                if (role === 'administrator') {
                                    contract.sum = res.sum / 100; // to Euros.
                                }
                            }
                            else {
                                contract.sum = res.sum / 100; // to Euros.
                            }

                            resolve({
                                status: 'success',
                                data: contract,
                            });
                        }
                        else {
                            resolve({
                                status: 'error',
                                code: '10035',
                                errors: ['Contract does not exist'],
                            });
                        }
                    }
                });
        });
    }

    module.updateContract = function (data, contractId) {
        return new Promise((resolve, reject) => {
            let updateFields = [];
            let params = [];

            let fieldNames = [
                {camelName: 'lessorId', sqlName: 'lessor_id'},
                {camelName: 'equipmentId', sqlName: 'equipment_id'},
                {camelName: 'sum', sqlName: 'sum'},
                {camelName: 'status', sqlName: 'status'},
                {camelName: 'workAddress', sqlName: 'work_address'},
            ];

            fieldNames.forEach((element) => {
                if (data[element.camelName] || data[element.camelName] ==='') {
                    updateFields.push(element.sqlName + '=?');
                    if (['sum'].includes(element.sqlName)) {
                        // Prices we store in cents.
                        params.push(data[element.camelName] * 100);
                    }
                    else {
                        params.push(data[element.camelName]);
                    }
                }
            });

            let sql = "UPDATE contracts SET " + updateFields.join(', ') + " WHERE id=?";
            params.push(contractId);

            connection.query(sql, params, function (err, results) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.updateContract(data, contractId)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000291',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    reject ({
                        status: 'error',
                        code: '00029',
                        errors: ['Internal error'],
                    });
                }
                else {
                    if (results.affectedRows > 0) {
                        resolve({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                    else {
                        reject({
                            status: 'error',
                            code: '10035',
                            errors: ['Contract does not exist'],
                        });
                    }
                }
            });
        });
    }

    module.removeContract = function (contractId) {
        return new Promise((resolve, reject) => {
            connection.query("DELETE FROM contracts WHERE id=?",
                [contractId],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.removeContract(contractId)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000301',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        reject({
                            status: 'error',
                            code: '00030',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        resolve ({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                });
        });
    }

    module.createService = function (body) {
        return new Promise((resolve, reject) => {
            let date_ob = new Date();
            let params = [
                body.contractId,
                body.sum * 100, // To cents
                body.description,
                body.type,
                date_ob.getTime(),
            ];

            let sql = "INSERT INTO services (contract_id, sum, description, type, created) VALUES ?";
            connection.query(sql, [[params]], function (err, insertResult) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.createService(body)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000311',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    reject({
                        status: 'error',
                        code: '00031',
                        errors: ['Internal error'],
                    });
                }
                else {
                    resolve({
                        status: 'success',
                        data: {
                            serviceId: insertResult.insertId,
                        },
                    });
                }
            });
        });
    }

    module.updateService = function (data, serviceId) {
        return new Promise((resolve, reject) => {
            let updateFields = [];
            let params = [];

            let fieldNames = [
                {camelName: 'sum', sqlName: 'sum'},
                {camelName: 'type', sqlName: 'type'},
                {camelName: 'description', sqlName: 'description'},
            ];

            fieldNames.forEach((element) => {
                if (data[element.camelName] || data[element.camelName] ==='') {
                    updateFields.push(element.sqlName + '=?');
                    if (['sum'].includes(element.sqlName)) {
                        // Prices we store in cents.
                        params.push(data[element.camelName] * 100);
                    }
                    else {
                        params.push(data[element.camelName]);
                    }
                }
            });

            let sql = "UPDATE services SET " + updateFields.join(', ') + " WHERE id=?";
            params.push(serviceId);

            connection.query(sql, params, function (err, results) {
                if (err) {
                    handleMysqlTimeoutError(err)
                      .then(function () {
                          module.updateService(data, serviceId)
                            .then(function (resolveResults) {
                                resolve(resolveResults);
                            }).catch(function (err) {
                              reject(err);
                          });
                      })
                      .catch(function (err) {
                          console.log(err);
                          resolve ({
                              status: 'error',
                              code: '000321',
                              errors: ['Internal error'],
                          });
                      });
                    console.log(err);
                    reject ({
                        status: 'error',
                        code: '00032',
                        errors: ['Internal error'],
                    });
                }
                else {
                    if (results.affectedRows > 0) {
                        resolve({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                    else {
                        reject({
                            status: 'error',
                            code: '10043',
                            errors: ['Service does not exist'],
                        });
                    }
                }
            });
        });
    }

    module.removeService = function (serviceId) {
        return new Promise((resolve, reject) => {
            connection.query("DELETE FROM services WHERE id=?",
                [serviceId],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.removeService(serviceId)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000331',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        reject({
                            status: 'error',
                            code: '00033',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        resolve ({
                            status: 'success',
                            data: {
                                affectedRows: results.affectedRows,
                            },
                        });
                    }
                });
        });
    }

    module.requestServices = function (role, contractId) {
        return new Promise((resolve, reject) => {
            let params = [];
            let sql = '';
            if (contractId) {
                sql = "SELECT s.* FROM services s WHERE s.contract_id=? ORDER BY created DESC";
                params.push(contractId);
            }
            else {
                sql = "SELECT s.* FROM services s ORDER BY created DESC";
            }

            connection.query(sql, [params],
                function(err, results, fields) {
                    if (err) {
                        handleMysqlTimeoutError(err)
                          .then(function () {
                              module.requestServices(role, contractId)
                                .then(function (resolveResults) {
                                    resolve(resolveResults);
                                }).catch(function (err) {
                                  reject(err);
                              });
                          })
                          .catch(function (err) {
                              console.log(err);
                              resolve ({
                                  status: 'error',
                                  code: '000341',
                                  errors: ['Internal error'],
                              });
                          });
                        console.log(err);
                        resolve ({
                            status: 'error',
                            code: '00034',
                            errors: ['Internal error'],
                        });
                    }
                    else {
                        // results
                        let data = [];
                        results.forEach((element) => {
                            let item = {
                                id: element.id,
                                contractId: element.contract_id,
                                sum: element.sum / 100, // to euros,
                                description: element.description,
                                type: element.type,
                                created: element.created,
                            };

                            data.push(item);
                        })
                        resolve ({
                            status: 'success',
                            data: data,
                        });
                    }
                });
        });
    }

    return module;
}

function handleMysqlTimeoutError(err) {
    return new Promise((resolve, reject) => {
        if (err.message === "Can't add new command when connection is in closed state"
          || err.message === "This socket has been ended by the other party") {
            console.log('CONNECTION TIMEOUT');
            mysqlDB.connect()
              .then(function(connection) {
                  console.log('CONNECTED AGAIN AFTER ERROR');
                  resolve();
              })
              .catch(function (err) {
                  console.log(err);
                  reject(err);
              });
        }
    });
}
