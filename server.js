//Initializing required packages
require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const app = express();
const bodyParser = require("body-parser");
const fs = require("fs");
const nodemailer = require("nodemailer");
const port = process.env.PORT; //fetch from .env file

app.use(bodyParser.json());
app.use(morgan());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// View engine setup
app.set("view engine", "ejs");

// we've started you off with Express,
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

//Setting up notification mail for every 15 mins
var start = true;
if (start) {
  var data = JSON.parse(fs.readFileSync("public/sentData.json", "utf8"));
  setInterval(() => {
    let success = sendMail(data);
    if (success) {
      start = false;
    }
  }, 900000);
}

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.render("index.ejs");
});

//Handles the form after submit
app.post("/status", async (request, response) => {
  const user = request.body.userid;
  const wish = request.body.wish;
  const fetch = require("node-fetch");
  const userUrl =
    "https://raw.githubusercontent.com/alj-devops/santa-data/master/users.json";
  const userProfileUrl =
    "https://raw.githubusercontent.com/alj-devops/santa-data/master/userProfiles.json";
  let error = "";
  //check for username
  if (user == "") {
    error = "userId is empty";
  }
  //check for wish
  if ((error == "") & (wish == "")) {
    error = "Wish is empty";
  }
  //check the conditions for valid user
  if (error == "") {
    let allUsers = await (await fetch(userUrl)).json(); //fetch the userList

    let allUserProfiles = await (await fetch(userProfileUrl)).json(); //fetch the userProfiles

    //Initializing the login user
    let loginUser = {
      username: "",
      uid: "",
      address: "",
      birthdate: "",
      wish: "",
    };

    //finding the user using the data entered in form
    for (var i = 0; i < allUsers.length; i++) {
      if (allUsers[i].username == user) {
        for (var j = 0; j < allUserProfiles.length; j++) {
          if (allUserProfiles[j].userUid == allUsers[i].uid) {
            loginUser.username = allUsers[i].username;
            loginUser.uid = allUsers[i].uid;
            loginUser.address = allUserProfiles[j].address;
            loginUser.birthdate = allUserProfiles[j].birthdate;
            loginUser.wish = wish;
            break;
          }
        }
      }
    }
    if (loginUser.username == "") {
      error = "you are not Registered";
    } else {
      const birthYear = new Date(loginUser.birthdate).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      if (age < 10) {
        var sentData = JSON.parse(
          fs.readFileSync("public/sentData.json", "utf8")
        );
        sentData.push(loginUser);
        var obj = fs.writeFileSync(
          "public/sentData.json",
          JSON.stringify(sentData),
          "utf8"
        );
        // Check for errors
      } else {
        error = "You can send wish if you are less than 10 years old";
      }
    }
  }
  //check for error and route accordingly
  if (!error == "") {
    response.render("error.ejs", { msg: error });
  } else {
    response.render("success.ejs", {
      msg: "Your wish has been received successfully...",
    });
  }
});

/* 
This method is used to send the e-mail body using ethereal
*/
function sendMail(data) {
  const output = getMailBody(data);

  // create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.ETHEREAL_USERNAME, // generated ethereal user
      pass: process.env.ETHEREAL_PASSWORD, // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: "do_not_reply@northpole.com", // sender address
    to: "santa@northpole.com", // list of receivers
    subject: "Pending Wish List", // Subject line
    text: "Find the Pending List Details Below", // plain text body
    html: output, // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return false;
    }

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    return true;
  });
}

/* 
This method is used to construct the mail body message
*/
function getMailBody(data) {
  let message = "";
  for (var i = 0; i < data.length; i++) {
    message +=
      "<h3>" +
      data[i].username +
      "</h3><ul><li>Address:" +
      data[i].address +
      "</li><li>Wish:" +
      data[i].wish +
      "</li></ul>";
  }
  return message;
}

// listen for requests
app.listen(port, () => {
  console.log(`Santa app is listening at http://localhost:${port}`);
});
