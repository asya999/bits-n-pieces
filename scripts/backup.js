/* ************************************************************************************************************* */
/* This example script is provided as a resource to help you write your own backup script.  Use at your own risk */
/* ************************************************************************************************************* */

/*   checks if server is currently locked and returns true or false */
isLocked=function() {
   var lockCheck = db.currentOp();
   if ( lockCheck.hasOwnProperty("fsyncLock") && lockCheck.fsyncLock) return true;
   else return false;
   
}

runBackup=function(backupCommand, force ) {

   /* because of possibility of multiple lock/unlock pairs, check if the DB is locked now, so */
   /* that we don't have to worry about checking if it's unlocked when we are finished */
   var wasLockedWhenWeStarted = isLocked();

   /* Check that if this is a replica set that we are a secondary */
   var isMaster=db.isMaster();
   if ( !force                                   /* if we're not given a force flag */
       && isMaster.hasOwnProperty("setName")     /* and we are talking to a replica set */
       && isMaster.primary ) {                   /* and we are connected to a primary */ 
      throw "This is a replica set, so we must be talking to a secondary!"
   }
 
   /* Lock the server, check the success */
   var lockResult = db.fsyncLock();
   if ( lockResult.ok != 1 ) {
      print("\nDidn’t successfully fsynLock  the server.  Returned status is " + lockResult.code + " " + lockResult.errmsg);
      throw "Exiting after error locking";
   } else print("\nCompleted fsyncLock command: now locked against writes.");
   
   /* to be super paranoid, check again that the server *is* fsyncLocked via db.currentOp() */
   if ( isLocked() ) print("Lock held, will proceed with backup\n");
   else throw "\nLock check via db.currentOp() failed!!!  \nAborting!!!";
   
   /* safe to proceed */
 
   /* so that we don't have to worry about spaces, we will run the "command" in its own shell */
   var prefix='bash';
   var here='-c';
   if ( _isWindows() ) {
       prefix='cmd';
       here='/c';
   }
   var sysResult = runProgram(prefix,here,backupCommand);
   
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

}

/* Calling the function with appropriate backup command
 *   example backupCommands could be:
 *    'ec2-create-snapshot -d "Description for the snapshot" vol-VOLUMEID'
 *    "tar czf /tmp/mybackup.tgz /data/db2"
 *    "myBackupScript.sh"
 *    "myBackupScript.bat"
 *    "nightlyBackup.py"
 *  etc, making sure to properly quote and/or escape any quotes or other special characters
 */

// runBackup('ec2-create-snapshot -d "Description for the snapshot" vol-VOLUMEID');

