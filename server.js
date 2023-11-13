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
const {User, Transaction, Bank_Account} = require("./schema");
const { log } = require("console");


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
app.use(bodyParser.json()); // Parses JSON bodies
app.use(bodyParser.raw()); // Parses raw bodies
app.use(bodyParser.text());
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
                    from: 'Fund Fortress Online Banking i4G <no-reply@fcmb.com>',
                    to: user.username,
                    subject: `Congratulations, Your account as been created`,
                    html:`<div
                    style="width: 100vw; height: 50vh; border-radius:10px; background-color: rgb(31, 34, 33); padding: 2rem 1.5rem; box-sizing: border-box; color: white;font-size: 1.2rem;">
                    <h1 style="text-align: center; font-size: 2.5rem;">Fund Fortress i4G</h1>
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


app.post("/send_money", async (req, res)=>{
    const recieverAcct = req.body.account
    const description = req.body.description
    const amount = req.body.amount
    
    try{
        const token = req.headers.authorization.split(" ")[1]
        const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET);
        const user = await User.findOne({_id:decodedToken._id})
        
        if(decodedToken._id == user._id){
            const recieverAccount = await Bank_Account.findOne({accountNumber:recieverAcct})
            const senderAccount = await Bank_Account.findOne({user:user._id})
            const recieverUser = await User.findOne({_id:recieverAccount.user})
            console.log(recieverUser)
            if(senderAccount.accountBalance >= Number(amount)){
                senderAccount.accountBalance = Number(senderAccount.accountBalance) - Number(amount)
                recieverAccount.accountBalance = Number(recieverAccount.accountBalance) + Number(amount)
                const saveSender = await senderAccount.save()
                const savereciever = await recieverAccount.save()
                const transaction = await Transaction.create({
                    transactionId : require("crypto").randomBytes(16).toString("hex"),
                    amount:amount,
                    transactionDate: new Date(),
                    sourceAccount: senderAccount.accountNumber,
                    destinationAccount: recieverAccount.accountNumber,
                    description: description,
                    
                })
                const mailOptionsDebit = {
                    from: 'Fund Fortress Online Banking i4G <no-reply@fcmb.com>',
                    to: user.username,
                    subject: `Fund Fortress Debit Transaction Notification`,
                    html:`<div
                    style="width: 100vw; min-height: 60vh; border-radius:10px; background-color: rgb(31, 34, 33); padding: 2rem 1.5rem; box-sizing: border-box; color: white;font-size: 1.1rem;">
                    <p style="margin: 0;">Dear ${user.lastName + " " + user.firstName} ,</p>
                    <small
                        style="opacity:.7; font-size: .8rem; border-bottom: 1px solid rgb(186, 175, 175); display: block; padding-bottom: 2rem;">Transaction
                        notification</small>
                    <p>Debit alert details</p>
            
                    <div style="display: flex; justify-content: space-around; font-size: .9rem; ">
                        <div style="margin-right: 4rem">
                            <p style="font-weight: bold; font-size: 1.1rem; color: rgb(120, 152, 240);">Amount</p>
                            <p>NGN ${amount}</p>
                        </div>
                        <div>
                            <p style="font-weight: bold; font-size: 1.1rem; color: rgb(120, 152, 240);">Current Balance</p>
                            <p>NGN ${senderAccount.accountBalance}</p>
                        </div>
            
                    </div>
                    <div>
                        <p style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0; color: rgb(120, 152, 240);">Description
                        </p>
                        <p style="margin-top: 0;">${transaction.description}</p>
                    </div>
                    <div>
                        <p style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0; ">Transaction Reference</p>
                        <p style="margin-top: 0;">${transaction.transactionId}</p>
                    </div>
                    <div>
                        <p style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0;">Transactin Date/Time</p>
                        <p style="margin-top: 0;">${new Date(transaction.transactionDate).toLocaleDateString("en-us", {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                        })}<br> ${new Date(transaction.transactionDate).toLocaleTimeString("en-us")}</p>
                    </div>
                    <p> Thank you for banking with us.</p>
                </div>`,
                };

                const mailOptionsCredit = {
                    from: 'Fund Fortress Online Banking i4G <no-reply@fcmb.com>',
                    to: recieverUser.username,
                    subject: `Fund Fortress Credit Transaction Notification`,
                    html:`<div
                    style="width: 100vw; min-height: 60vh; border-radius:10px; background-color: rgb(31, 34, 33); padding: 2rem 1.5rem; box-sizing: border-box; color: white;font-size: 1.1rem;">
                    <p style="margin: 0;">Dear ${recieverUser.lastName + " " + recieverUser.firstName} ,</p>
                    <small
                        style="opacity:.7; font-size: .8rem; border-bottom: 1px solid rgb(186, 175, 175); display: block; padding-bottom: 2rem;">Transaction
                        notification</small>
                    <p>Credit alert details</p>
            
                    <div style="display: flex; justify-content: space-around; font-size: .9rem; ">
                        <div style="margin-right: 4rem">
                            <p style="font-weight: bold; font-size: 1.1rem; color: rgb(120, 152, 240);">Amount</p>
                            <p>NGN ${amount}</p>
                        </div>
                        <div>
                            <p style="font-weight: bold; font-size: 1.1rem; color: rgb(120, 152, 240);">Current Balance</p>
                            <p>NGN ${recieverAccount.accountBalance}</p>
                        </div>
            
                    </div>
                    <div>
                        <p style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0; color: rgb(120, 152, 240);">Description
                        </p>
                        <p style="margin-top: 0;">${transaction.description}</p>
                    </div>
                    <div>
                        <p style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0; ">Transaction Reference</p>
                        <p style="margin-top: 0;">${transaction.transactionId}</p>
                    </div>
                    <div>
                        <p style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0;">Transactin Date/Time</p>
                        <p style="margin-top: 0;">${new Date(transaction.transactionDate).toLocaleDateString("en-us", {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}<br> ${new Date(transaction.transactionDate).toLocaleTimeString("en-us")}</p>
                    </div>
                    <p> Thank you for banking with us.</p>
                </div>`,
                  };
                  transporter.sendMail(mailOptionsDebit, (err, info) => {
                    if (err) {
                      console.log(err);
                    } else {
                      console.log('Email sent successfully!');
                    }
                  });
                  transporter.sendMail(mailOptionsCredit, (err, info) => {
                    if (err) {
                      console.log(err);
                    } else {
                      console.log('Email sent successfully!');
                    }
                  });
                res.status(200).json({message:"funds transferred", balance:senderAccount.accountBalance})
            }
            else{
                res.status(500).json({error:"Not enough money in your account!"})
            }
            
        }else{
            res.status(401).json({message:"You are unauthorised"})
        }
    }catch (err){
        return res.status(500).json({message:"Invalid Token!", error: err.message});
    }
})

app.get("/getAccount", async (req, res)=>{
    const recieverAcct = req.query.account
   
    try{
        const token = req.headers.authorization.split(" ")[1]
        const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET);
        const user = await User.findOne({_id:decodedToken._id})
        if(decodedToken._id == user._id){
            const userID = await Bank_Account.findOne({accountNumber:recieverAcct})
            if (userID){
                const recieverName = await User.findById(userID.user)
                res.status(200).json({message:recieverName.firstName + " " + recieverName.lastName})

            }else{
                res.status(401).json({error:"Account not found"})
            }
            
        }else{
            res.status(401).json({message:"You are unauthorised"})
        }
    }catch (err){
        return res.status(500).json({error:"Invalid Token!"});
    }
    
})

app.get("/update_dashboard", async (req, res)=>{
    try{
        const token = req.headers.authorization.split(" ")[1]
        
        const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET);
        
        const user = await User.findOne({_id:decodedToken._id})
        if(decodedToken._id == user._id){
            const account = await Bank_Account.findOne({user:user._id})
            const transactions = await Transaction.find({$or:[{sourceAccount:String(account.accountNumber)},{destinationAccount:String(account.accountNumber)}]}).sort("-transactionDate").limit(10)
            res.status(200).json({message:account.accountBalance, transactions:transactions})
                
        }else{
            res.status(401).json({message:"You are unauthorised"})
        }
    }catch (err){
        
        return res.status(500).json({error:"Invalid Token!"});
    }
})


let otp

app.get("/sendotp", async (req, res)=>{

    otp = Math.floor(Math.random() * 10000) 
    try{
        const token = req.headers.authorization.split(" ")[1]
        
        const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET);
        
        const user = await User.findOne({_id:decodedToken._id})
        if(decodedToken._id == user._id){
            const mailOptions = {
                from: 'Fund Fortress Online Banking i4G <no-reply@fcmb.com>',
                to: user.username,
                subject: `SecureOTP Transaction`,
                html:`<div
                style="width: 100vw; height: 50vh; border-radius:10px; background-color: rgb(31, 34, 33); padding: 2rem 1.5rem; box-sizing: border-box; color: white;font-size: 1.2rem;">
                <h1 style="text-align: center; font-size: 2.5rem;">Fund Fortress i4G</h1>
                <p>Dear ${user.lastName + " " + user.firstName},</p>
                <p>Your one time password is: <strong>${otp}</strong></p>
                
            </div>`,
            };
            transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log(err);
            } else {
                console.log('Email sent successfully!');
            }
            });
            res.status(200).json({message:"otp sent"})
        }else{
            res.status(401).json({message:"You are unauthorised"})
        }
    }catch (err){
        
        return res.status(500).json({error:"Invalid Token!"});
        
    }
    
})

app.post("/add_money", async (req, res)=>{
    const {amount, myOtp, accountNumber} = req.body
    const token = req.headers.authorization.split(" ")[1]
    
    if (Number(otp) === Number(myOtp)){
        const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET);
        const user = await User.findOne({_id:decodedToken._id})
        if(decodedToken._id == user._id){

            if(Number(amount) > 50000){
                res.status(401).json({error:"You are not allowed to deposit more than 50,000 per deposit"})
            }else{
                const bankDetails = await Bank_Account.findOne({accountNumber:accountNumber})
            
            bankDetails.accountBalance = bankDetails.accountBalance + Number(amount)
            await bankDetails.save()
            const transaction = await Transaction.create({
                transactionId : require("crypto").randomBytes(16).toString("hex"),
                amount:amount,
                transactionDate: new Date(),
                sourceAccount: "Deposit",
                destinationAccount: bankDetails.accountNumber,
                description: "Deposit",
            })

            const mailOptionsCredit = {
                from: 'Fund Fortress Online Banking i4G <no-reply@fcmb.com>',
                to: user.username,
                subject: `Fund Fortress Credit Transaction Notification`,
                html:`<div
                style="width: 100vw; min-height: 60vh; border-radius:10px; background-color: rgb(31, 34, 33); padding: 2rem 1.5rem; box-sizing: border-box; color: white;font-size: 1.1rem;">
                <p style="margin: 0;">Dear ${user.lastName + " " + user.firstName} ,</p>
                <small
                    style="opacity:.7; font-size: .8rem; border-bottom: 1px solid rgb(186, 175, 175); display: block; padding-bottom: 2rem;">Transaction
                    notification</small>
                <p>Credit alert details</p>
        
                <div style="display: flex; justify-content: space-around; font-size: .9rem; ">
                    <div style="margin-right: 4rem">
                        <p style="font-weight: bold; font-size: 1.1rem; color: rgb(120, 152, 240);">Amount</p>
                        <p>NGN ${amount}</p>
                    </div>
                    <div>
                        <p style="font-weight: bold; font-size: 1.1rem; color: rgb(120, 152, 240);">Current Balance</p>
                        <p>NGN ${bankDetails.accountBalance}</p>
                    </div>
        
                </div>
                <div>
                    <p style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0; color: rgb(120, 152, 240);">Description
                    </p>
                    <p style="margin-top: 0;">${transaction.description}</p>
                </div>
                <div>
                    <p style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0; ">Transaction Reference</p>
                    <p style="margin-top: 0;">${transaction.transactionId}</p>
                </div>
                <div>
                    <p style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0;">Transactin Date/Time</p>
                    <p style="margin-top: 0;">${new Date(transaction.transactionDate).toLocaleDateString("en-us", {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    })}<br> ${new Date(transaction.transactionDate).toLocaleTimeString("en-us")}</p>
                </div>
                <p> Thank you for banking with us.</p>
            </div>`,
            };
            transporter.sendMail(mailOptionsCredit, (err, info) => {
            if (err) {
                console.log(err);
            } else {
                console.log('Email sent successfully!');
            }
            });

            res.status(200).json({message:"deposit was successful"})

            }

            
        }else{
            res.status(401).json({error:"Invalid token!"});
        }
        
    }else{
        res.status(401).json({error:"Invalid OTP!"});
    }
})



app.post("/logout", (req, res) => {
    req.logout((err) => {
        if (!err) {
            res.status(200).json({ message: "user logged out" });
        } else {
            res.status(500).json({ error: "unable to logout user" });
        }
    });
});


app.listen(port, ()=>{
    console.log(`server started on port ${port}`)
})