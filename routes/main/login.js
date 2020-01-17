const express = require('express');
const router = express.Router();
const async = require('async');
const _crypto = require('crypto');
const pool = require('../../config/dbPool');
const util = require('../../module/utils');
const statusCode = require('../../module/statusCode');
const jwt = require('jsonwebtoken');

// 토큰 설정
let option = {
    algorithm: "HS512",
    expiresIn: 3600 * 24 * 1 // 하루
}

// 로그인
// 1. client에서 id와 pwd를 보낸다.
// 2. 서버에서 salt값을 꺼내와 pwd를 암호화한다.
// 3. 서버에 저장된 pwd와 일치한지 확인한다.
// 3. 일치하면 토큰을 발급해준다. (client는 이것을 저장해두었다가 사용)
router.post('/', (req, res) => {

    let { id, pwd } = req.body;
    let selectSaltQuery =
    `
        SELECT user_pwd_salt
        FROM user 
        WHERE user_id = ?
    `;

    let comparePwdQuery =
    `
        SELECT user_pwd
        FROM user
        WHERE user_pwd = ?
    `;

    let taskArray = [
        (callback) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(statusCode.DB_ERROR, "DB Error")
                    );
                    callback("DB connection err : " + err);
                } else {
                    callback(null, connection);
                }
            });
        },

        (connection, callback) => {
            connection.query(selectSaltQuery, [id], (err, selectedSalt) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(statusCode.DB_ERROR, "DB Error")
                    );
                    connection.release();
                    callback("login error : " + err);
                } else {
                    callback(null, selectedSalt, connection);
                }
            });
        },

        (selectedSalt, connection, callback) => {
            if (selectedSalt.length == 0) {
                res.status(200).send(
                    util.successTrueNoData(statusCode.NO_CONTENT, "해당하는 유저가 없습니다. 로그인 실패", [])
                );
                connection.release();
            } else {
                pwd = _crypto.pbkdf2Sync(pwd, selectedSalt[0].user_pwd_salt, 420000, 32, 'sha512').toString('base64');
                connection.query(comparePwdQuery, [pwd], (err, selectedUser) => {
                    if (err) {
                        res.status(200).send(
                            util.successFalse(statusCode.DB_ERROR, "DB Error")
                        );
                        connection.release();
                        callback("login error : " + err);
                    } else {
                        callback(null, selectedUser, connection);
                    }
                });
            }
        },

        (selectedUser, connection, callback) => {
            if (selectedUser.length != 0) {
                let payload = {
                    id: id,
                    pwd: pwd
                }

                let resultArray = [];
                let userInfo = {};

                // 로그인 할 때마다 토큰 발행
                jwt.sign(payload, req.app.get('secret'), option, (err, token) => {
                    if (err) {
                        res.status(500).send({
                            status: false,
                            message: "500 error"
                        });
                        connection.release();
                        callback("get jwt token error : " + err);
                    } else {
                        userInfo.token = token;
                        resultArray.push(userInfo);
                        res.status(201).send(util.successTrue(statusCode.OK, '로그인 성공', resultArray));
                        connection.release();
                    }
                })

            } else { // 일치하지 않는 비밀번호
                res.status(200).send(
                    util.successTrue(statusCode.NOT_CORRECT, "비밀번호가 일치하지 않습니다. 로그인 실패", [])
                );
                connection.release();
            }
        }
    ];
    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    });
});



module.exports = router;