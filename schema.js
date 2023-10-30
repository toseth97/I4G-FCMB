const mongoose = require("mongoose")
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    prefix:{
        type: String,
    },
    username:{
        type:String,
        required:true,
        unique:true
    },
    lastName:{
        type: String,
        required: true,
    },
    firstName:{
        type: String,
        required: true,
    },
    address:{
        type: String,
    },
    
    dob:{
        type: String,
        required: true,
    },
    profilePicture: {
        type: String,
    },
    createdAt: {
    type: Date,
    default: Date.now,
    },
    updatedAt: {
    type: Date,
    default: Date.now,
    },
    phoneNo:{
        type:String,
        require: true
    }
    

})


const bankAccountSchema = new mongoose.Schema({
    accountBalance:{
        type:Number,
        required:true,
        default:0.0
    },
    accountNumber: {
      type: String,
      required: true,
    },
    bankCode: {
      type: String,
      required: true,
    },
    accountType: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "NGN"
    },
    branchCode: {
      type: Object,
      required: true,
    },
    IBAN: {
      type: String,
    },
    BIC: {
      type: String,
    },
    user:{
        type :String ,
        required: true
    },
    dateCreated:{
        type: Date,
        default: Date.now()
    }
  });

  const transactionSchema = new mongoose.Schema({
    transactionId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    transactionType: {
      type: String,
      required: true,
    },
    transactionDate: {
      type: Date,
      required: true,
    },
    sourceAccount: {
      type: String,
      required: true,
    },
    destinationAccount: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    fees: {
      type: Number,
    },
    status: {
      type: String,
    },
  });


userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);
const Transaction = mongoose.model("Transaction", transactionSchema)
const Bank_Account = mongoose.model("Bank_Account", bankAccountSchema)

passport.use(User.createStrategy());

module.exports = {User, Transaction, Bank_Account}