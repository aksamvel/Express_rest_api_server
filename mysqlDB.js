const mysql = require("mysql2");

exports.connect = function() {
    return new Promise((resolve, reject) => {
        const conn = mysql.createConnection({
            host: process.env.DB_MYSQL_HOST,
            user: process.env.DB_MYSQL_USER,
            database: process.env.DB_MYSQL_DATABASE,
            password: process.env.DB_MYSQL_PASS
        });
        conn.connect(function(err){
            if (err) {
                reject(err);
            }
            else {
                console.log("Подключение к серверу MySQL успешно установлено");
                connection = conn;
                resolve(conn)
            }
        });
    });
};