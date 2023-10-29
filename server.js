require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const LocalStrategy = require("passport-local");
const passport = require("passport");
const session = require("express-session");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer")
const nodemailer = require("nodemailer")
const {User, Transaction, Bank_Account} = require("./schema")


//initializing Express framework
const app = express();
const port = process.env.PORT || 3300;
const corsOptions = {
    origin: "*",
    credentials: true,
    //access-control-allow-credentials:true,
    optionSuccessStatus: 200,
};

// initializing memory storage for multer
const storage = multer.memoryStorage()
const upload = multer({storage:storage})



//set up ur middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: true,
    })
);
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());
app.use(cors(corsOptions));



passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});



mongoose
    .connect(process.env.URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
    .then(console.log("Connected to db"))
    .catch((err) => console.log(err.message));


const bankCode ="FCMB"
const branch = [
    {"FMCB0001":"25b Ilupeju Byepass, Off Coker Junction "},
    {"FMCB0002":"91 Ladipo St · 01 761 8030 "},
    {"FMCB0003":"30 Osolo Wy · 0815 723 2119 "},
    {"FMCB0004":"G9W6+JP6, Ikeja, Oshodi, Bypass Road, Lagos "},
    {"FMCB0005":"481, Agege Motor Road, opposite Arena Shopping Complex, Lagos "},
    {"FMCB0006":"23/ 25, Murtala Muhammed, Ikeja, 100272, Lagos "},
    {"FMCB0007":"31 Shipeolu St, Somolu 100272, Lagos "},
    {"FMCB0008":"178 Ikorodu-Ososun Rd, Onipanu 102216, Lagos "},
    {"FMCB0009":"Mofoluku, Oshodi, 7/ 8 Airport Rd, Ikeja, Lagos "},
    {"FMCB0010":"11 Ijaiye Street, Oke Arin St, Lagos "},
]

//transport layer for mailing
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PWD,
    },
  });

const getAcc = ()=>{
    let a = Math.floor(Math.random() * 10000000000)
    if (String(a).length < 10){
        a = String(a)+ Math.floor(Math.random() * 1)
        return (a)
    }else{
        return (String(a))
    }

}

async function acctCh (){
    const accountNumber = getAcc()
    const checkAccount = await Bank_Account.findOne({accountNumber:accountNumber})
    if (!checkAccount){
        return accountNumber;
    }
    else(acctCh())

}





//login endpoint

app.post("/signup", async (req, res) => {
    const { email, firstName, lastName,dob, password, confirm_password, address } = req.body;
    const user = new User({
        username: String(email).toLowerCase(),
        firstName: firstName,
        lastName: lastName,
        dob:dob,
        address:address
    });
    if (password === confirm_password) {
        User.register(user, password, async (err, user) => {
            if (err) {
                console.log(err.message);
                res.status(400).json({
                    error: err.message,

                });
            } else {
                const user = await User.findOne({username:email})
                const dob = new Date(user.dob)
                const currentAge = new Date().getFullYear() - new Date(dob).getFullYear()
                const acctType = Number(currentAge) >= 16 ? "Adult_Account":"Children_Account" 
                const acctNum = await acctCh()
                const accountDetails = await Bank_Account.create({
                    accountNumber:acctNum,
                    bankCode: bankCode,
                    accountType: acctType,
                    branchCode:branch[Math.ceil(Math.random()*9)], 
                    user: user._id,
                })
                const mailOptions = {
                    from: 'FCMB Online Banking i4G <no-reply@fcmb.com>',
                    to: user.username,
                    subject: `Congratulations, Your account as been created`,
                    html:`<div
                    style="width: 100vw; height: 50vh; border-radius:10px; background-color: rgb(31, 34, 33); padding: 2rem 1.5rem; box-sizing: border-box; color: white;font-size: 1.2rem;">
                    <h1 style="text-align: center; font-size: 2.5rem;">FCMB i4G</h1>
                    <p>Dear ${user.lastName + " " + user.firstName},</p>
                    <p>Thank you for opening an account with us, Your bank account number is below</p>
                    <p>Account Number: <span style="font-weight: bold;">${accountDetails.accountNumber}</span> </p>
                    <p> Thank you for banking with us.</p>
                </div>`,
                  };
                  transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                      console.log(err);
                    } else {
                      console.log('Email sent successfully!');
                    }
                  });
                res.status(200).json({
                    user: user.username,
                    fullName: user.lastName + " " + user.firstName,
                    accountNumber: accountDetails.accountNumber,
                    accountType: accountDetails.accountType,
                    bankBranchAdd: branch.filter(item=> item === accountDetails.branchCode)[0],
                    message: "Account created, You can start banking",
                });
            }
        });
    } else {
        res.status(400).json({
            error: "password does not match",
        });
    }
});

app.post("/auth_login", async (req, res)=>{
    let { username,password } = req.body;
    // {if (Number(username)){
    //     const {user} = await Bank_Account.findOne({accountNumber:String(username)})
    //     username = await User.findOne({_id:user})
    // }}
    const user = {
        username:username.toLowerCase(),
        password:password
    }

    passport.authenticate("local", (err, user) => {
        if (err) throw err;
        if (!user)
            res.status(401).json({ error: "Username or password incorrect" });
        else {
            req.logIn(user, async (err) => {
                if (err) throw err;
                const token = jwt.sign(
                    { _id: user._id, },
                    process.env.TOKEN_SECRET
                );
                const loggedUser = await User.findOne({username:username}).select(["-salt", "-hash"])
                const account = await Bank_Account.findOne({user:loggedUser._id}).select(["-_id", "-user", "-__v"])
                res.header("auth-token", token).status(200).json({
                    email:loggedUser.username,
                    fullName: loggedUser.lastName + " " + loggedUser.firstName,
                    account,
                    token: token,
                });
            });
        }
    })(req, res)
    
})


app.post("/send_money", (req, res)=>{
    
})



app.listen(port, ()=>{
  console.log(`server started on port ${port}`)
})