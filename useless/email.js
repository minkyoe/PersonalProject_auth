const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

router.post("/nodemailerTest", function (req, res, next) {
  let email = req.body.email;

  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'kimmk0924@gmail.com',  // gmail 계정 아이디를 입력
      pass: 'dnrjwl0415'          // gmail 계정의 비밀번호를 입력
    }
  });

  let mailOptions = {
    from: 'kimmk0924@gmail.com',    // 발송 메일 주소 (위에서 작성한 gmail 계정 아이디)
    to: email,                     // 수신 메일 주소
    subject: '안녕하세요, 이메일 인증을 해주세요',   // 제목
    text: 'That was easy!',  // 내용
    html: '<p>아래의 링크를 클릭해주세요 !</p>' +
      "<a href='http://localhost:3000/auth/?email=" + email + "&token=abc'>인증하기</a>"  // token 허접하지만 일단은 확인용으로 abc해놓음
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    }
    else {
      console.log('Email sent: ' + info.response);
    }
  });

  res.redirect("/");
})

module.exports = router;