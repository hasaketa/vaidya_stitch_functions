//function provideAnalysis
exports = function (arg) {

  console.log("provideAnalysis function called");
  //First phase generate a new requestId
  //Call the mongodb Atlas service
  var collection = context.services.get("mongodb-atlas").db("vaidya").collection("info");
  //Retrieve the Atlas API key stored for the user. 
  var atlas_apikey = context.values.get("userinfo").atlas_apikey;
  var atlas_username = context.values.get("userinfo").atlas_username;
  //Atlas node details
  var group_id = context.values.get("userinfo").group_id;
  var hostname = context.values.get("userinfo").hostname;
  //Start and end time of logs
  var start_epoch = "1531734697";
  var end_epoch = "1531738697";
  //Set status flag
  // pending = awaiting execution of the log analysis engine to upload logs to S3
  var status = "pending";
  //set the type of logs to analyze mongodb/mongos etc. 
  var log_type = "mongodb";
  //insert the document with details to app database
  return collection.insertOne({ owner_id: context.user.id, username: atlas_username, password: atlas_apikey, groupid: group_id, log_type: log_type, start_epoch: start_epoch, end_epoch: end_epoch, hostname: hostname, status: status })
    .then(result => {
      const { insertedId } = result;
      console.log("Process request received from Stitch Client, requestId is " + insertedId);
    });
};

//Function sendReport invoked by on Database update trigger
exports = function(changeEvent) {
  /*
    A Trigger will always call a function with a ChangeEvent.
    Documentation on ChangeEvents: https://docs.mongodb.com/manual/reference/change-events/
  */
    
    console.log("sendReport function called");
    var updateDescription = changeEvent.updateDescription;
    //See which fields were changed (if any):
    if (updateDescription) {
      var updatedFields = updateDescription.updatedFields; // A document containing updated fields
      console.log(updatedFields.status);
      console.log(updatedFields.s3ObjectPath);
      if(updatedFields.status === "done") {
        console.log("Will now send an email");
        s3ObjectPath = updatedFields.s3ObjectPath;
        if(!s3ObjectPath) { 
          console.log("s3ObjectPath path not set in the updated document. Check the goApp!");
          return 500;
        }
        console.log("s3ObjectPath path received " + s3ObjectPath);
        //Pass the s3 object path to lambda function
        return context.functions.execute("callsess3logslambda",s3ObjectPath);
    } else {
      console.log("Something not right! Status returned by log engine: " + updatedFields.status);
      return context.functions.execute("emailtest","Sorry but the report cannot be generated at this time, see Stitch Console logs");
    }
}};

//callsess3logslambda function
exports = function(arg){
  console.log('s3ObjectPath path is ',arg);
  var sess3logslambda = context.services.get("sess3logslambda");
  var url= 'https://7mfpvfo3v1.execute-api.us-east-1.amazonaws.com/poc/sess3logs'+'?s3ObjectPath='+arg;
  return sess3logslambda.get({ "url" : url });
};