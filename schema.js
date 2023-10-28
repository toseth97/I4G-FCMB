const mongoose = require("mongoose")
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
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
        required: true,
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
    

})


const bankAccountSchema = new mongoose.Schema({
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
    },
    IBAN: {
      type: String,
    },
    BIC: {
      type: String,
    },
    user:{
        type :mongoose.Types.ObjectId ,
        ref:'User',
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    destinationAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
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