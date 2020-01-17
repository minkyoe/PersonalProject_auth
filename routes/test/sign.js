const express = require('express');
const router = express.Router();
const async = require('async');
const _crypto = require('crypto');
const pool = require('../../config/dbPool');
const util = require('../../module/utils');
const status = require('../../module/statusCode');
const nodemailer = require('nodemailer');
const _redis = require('redis');
const secretEmail = require('../../config/email');
const redisClient = _redis.createClient({
    host: "127.0.0.1",
    port: 6379 // redis 기본 포트번호
});

// 이메일 인증코드 생성
function createKeyVerify() {
    var keyOne = _crypto.randomBytes(256).toString('hex').substr(100, 5);
    var keyTwo = _crypto.randomBytes(256).toString('base64').substr(50, 5);
    var keyVerify = keyOne + keyTwo;
    return keyVerify;
}

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: secretEmail.user,
        pass: secretEmail.pass
    }
});

router.post('/', (req, res) => {

    let { email, id, pwd } = req.body;
    let salt = _crypto.randomBytes(64).toString('base64');
    pwd = _crypto.pbkdf2Sync(pwd, salt, 420000, 32, 'sha512').toString('base64');

    let verifyCode = createKeyVerify();
    let selectUserQuery =
    `
        SELECT * 
        FROM user 
        WHERE user_id = ? OR user_email = ?
    `;

    let insertUserQuery =
    `
        INSERT INTO user
        VALUES(?,?,?,?,?,?,?);
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
            connection.query(selectUserQuery, [id, email], (err, selectedUser) => {
                if (err) {
                    res.status(200).send(
                        util.successFalse(status.DB_ERROR, "DB Error")
                    );
                    connection.release();
                    callback("sign errorrrr : " + err);
                } else callback(null, selectedUser, connection);
            });
        },

        (selectedUser, connection, callback) => {
            if (selectedUser.length > 0) { // db에 저장된 user가 있을 때
                res.status(200).send(
                    util.successTrue(status.OK, "이미 가입된 유저입니다.", false)
                );
                connection.release();

            } else { // db에 저장된 user가 없을 때
                connection.query(insertUserQuery, [null, id, email, pwd, 0, 0, salt], (err, data) => { // salt값 일단 0으로 & 인증코드 db저장X redis에 저장O
                    if (err) {
                        res.status(200).send(
                            util.successFalse(status.DB_ERROR, "DB Error")
                        );
                        connection.release();
                        callback("sign error : " + err);
                    } else {
                        // 이메일 전송 옵션 설정
                        let mailOptions = {
                            from: secretEmail.user,    // 발송 메일 주소 (위에서 작성한 gmail 계정 아이디)
                            to: email,                     // 수신 메일 주소
                            subject: '안녕하세요, 이메일 인증을 해주세요',   // 제목
                            text: 'That was easy!',  // 내용
                            html: '<p>아래의 코드를 앱에서 입력해주세요 !</p>' +
                                "<h1>" + verifyCode + "</h1>"
                        };

                        // 이메일 전송
                        transporter.sendMail(mailOptions, function (err, res) {
                            if (err) console.log(err);
                            else console.log('email has been sent.');
                            transporter.close();
                        });

                        // redis에 유저 아이디-인증코드 저장
                        redisClient.set(id, verifyCode, function (err, data) {
                            if (err) {
                                console.log(err);
                                res.send("error " + err);
                                return;
                            } else {
                                redisClient.expire(id, 600); // 10분 뒤 만료
                            }
                        });


                        res.status(201).send(
                            util.successTrue(status.CREATED, "회원가입 성공", true)
                        );
                        connection.release();
                        callback(null, "success insert new user");
                    }
                });
            }
        }
    ];
    async.waterfall(taskArray, (err, result) => {
        if (err) console.log(err);
        else console.log(result);
    });
});



module.exports = router;