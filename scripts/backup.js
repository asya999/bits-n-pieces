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
   var lockedAtStart = isLocked();
   if (lockedAtStart) {
     if (force) print("Continuing due to force flag, even though server is already locked");
     else throw "Aborting backup since someone else already has server locked!";
   }

   /* Check that if this is a replica set that we are a secondary */
   var isMaster=db.isMaster();
   if ( !force                                   /* if we're not given a force flag */
       && isMaster.hasOwnProperty("setName")     /* and we are talking to a replica set */
       && isMaster.primary ) {                   /* and we are connected to a primary */ 
      throw "This is a replica set, so we must be talking to a secondary!"
   }
 
   /* Lock the server, check success */
   var lockResult = db.fsyncLock();
   if ( lockResult.ok != 1 ) {
      print("\nDidn’t successfully fsynLock  the server.  Returned status is " + lockResult.code + " " + lockResult.errmsg);
      throw "Exiting after error locking";
   } else print("\nCompleted fsyncLock command: now locked against writes.\n");
   
   /* safe to proceed */
 
   /* so that we don't have to worry about spaces, we will run the "command" in its own subshell */
   var prefix='bash';
   var here='-c';
   if ( _isWindows() ) {
       prefix='cmd';
       here='/c';
   }
   var sysResult = runProgram(prefix,here,backupCommand);
   sleep(100);
   
   /* we assume a successfull command/script will return 0, any other return code indicates error */
   if ( sysResult != 0 )  print("\nDid not successfully run the backup command.  Returned status is " + sysResult);
   else print("\nSuccessfully ran the backup command.\n");
   
   /* Now clean up */
   
   print("\nWill fsyncUnlock the server now.");
   
   /* we always run unLock regardless of success of backup! */
   var unlockResult = db.fsyncUnlock();
   if ( unlockResult.ok != 1 ) {
      if ( errmsg == "not locked" ) print("\nServer was already unlocked!");
      else {
          print("\nDidn’t successfully fsynUnlock  the server.  \nReturned status is " + tojson(unlockResult));
       /* Next section can be uncommented to keep trying to unlock if you want to guarantee the server is unlocked
          when the script is finished.  However, this is not safe, since other processes may not be paying
          attention to already locked state and queueing their lock requests anyway */
      /*  print("\tWill try again every 5 seconds!");
          while (unlockResult.ok!=1) {
              if (unlockResult.errmsg=='not locked') { 
                   print("\t\tServer no longer locked"); 
                   break; 
              }
              sleep(5000);
              unlockResult=db.fsyncUnlock();
          }
       */
      }
   }

   if (!isLocked() ) {
      print("\nServer is unlocked.  We are finished.\n");
   }

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

