/* ************************************************************************************************************* */
/* This example script is provided as a resource to help you write your own backup script.  Use at your own risk */
/* ************************************************************************************************************* */

/* Lock the server, check the success */
var lockResult = db.fsyncLock();
if ( lockResult.ok != 1 ) {
   print("\nDidn’t successfully fsynLock  the server.  Returned status is " + lockResult.code + " " + lockResult.errmsg);
   throw "Exiting after error locking";
} else print("\nCompleted fsyncLock command: now locked against writes.");

/* to be super paranoid, check that the server *is* fsyncLocked via db.currentOp() */
var lockCheck = db.currentOp();
if ( lockCheck.hasOwnProperty("fsyncLock") && lockCheck.fsyncLock) print("Lock held, will proceed with backup\n");
else throw "\nLock check via db.currentOp() failed!!!  \nAborting!!!";

/* safe to proceed */
var sysResult = runProgram("ec2-create-snapshot","-d",'"Description for the snapshot"',"vol-VOLUMEID");

/* we assume a successfull command/script will return 0, any other return code indicates error */
if ( sysResult.ok != 0 )  print("\nDid not successfully run the backup command.  Returned status is " + sysResult);
else print("\nSuccessfully ran the backup command.");

/* Now clean up */

print("\nWill fsyncUnlock the server now.");

/* we always run unLock regardless of success of backup! */
var unlockResult = db.fsyncUnlock();
if ( unlockResult.ok != 1 ) {
   if ( errmsg == "not locked" ) print("\nServer was already unlocked!  \nPlease check logic of previous steps!");
   else {
       print("\nDidn’t successfully fsynUnlock  the server.  \nReturned status is " + tojson(unlockResult));
       print("\tWill try again every 5 seconds!");
       while (unlockResult.ok!=1) {
           if (unlockResult.errmsg=='not locked') { 
                print("\t\tServer no longer locked"); 
                break; 
           }
           sleep(5000);
           unlockResult=db.fsyncUnlock();
       }
   }
}

/* If we are here, then we unlocked the server */
print("\nServer is unlocked.  We are finished.");

