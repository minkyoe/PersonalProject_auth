const express = require('express');
const router = express.Router();
const async = require('async');
const _crypto = require('crypto');
const pool = require('../../config/dbPool');
const util = require('../../module/utils');
const status = require('../../module/statusCode');



// 비밀번호 변경
router.post('/', (req, res) => {

    let { id, pwd } = req.body;
    let salt = _crypto.randomBytes(64).toString('base64');
    pwd = _crypto.pbkdf2Sync(pwd, salt, 420000, 32, 'sha512').toString('base64');

    let updateUserQuery =
    `
        UPDATE user
        SET user_pwd = ?, user_pwd_salt = ?
        WHERE user_id = ?
    `;


    let taskArray = [
        (callback) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(status.DB_ERROR, "DB Error")
                    );
                    callback("DB connection err : " + err);
                } else callback(null, connection);
            });
        },

        (connection, callback) => {
            connection.query(updateUserQuery, [pwd, salt, id], (err, data) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(status.DB_ERROR, "DB Error")
                    );
                    connection.release();
                    callback("edit pwd errorrrr : " + err);
                } else {
                    res.status(201).send(
                        util.successTrue(status.CREATED, "비밀번호 변경 성공", true)
                    );
                    connection.release();
                    callback(null, "success edit pwd");
                }
            });
        }
    ];
    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    });
});



module.exports = router;