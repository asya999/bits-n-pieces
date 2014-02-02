# This script requires suds that provides SOAP bindings for python.
#
# Download suds from https://fedorahosted.org/suds/
#
# unpack it and then run:
# python setup.py install
#
# This may require you to install setuptools (an .exe from python.org)

from WebService import WSOpts
from DefectService import DefectServiceClient
from ConfigService import ConfigServiceClient
import smtplib
import datetime
import sys
import logging

def main():
    """
     create and send notifications to all users who currently have assigned
     any defects that are outstanding (maybe flagging those that are new)
    """
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    # use --test flag to avoid sending e-mail while debugging this script
    parser.set_defaults(testing="False")
    parser.add_option("--test",  action="store_true", dest="testing",  default="False", help="Testing flag: no mail just echo to stdout");
    parser.add_option("--detail",  action="store_true", dest="detail",  default="False", help="Detail flag: add a bunch of details about the bugs");
    parser.add_option("--days",  dest="days",  type=int, default=1, help="Days to check for new to notify about (default last 24 hours)");

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ()):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)
    defectServiceClient = DefectServiceClient(options)

    # calculate when the action would have to be since to get reported
    cutoff = datetime.datetime.today()-datetime.timedelta(options.days)

    # all assignable users - no disabled users, since they should not be notified
    users = configServiceClient.get_all_users()

    # get the streams for relevant project or get all if none
    streamIdDO = configServiceClient.get_streams(options.project,options.stream)

    mergedDefectDOs = defectServiceClient.get_merged_defects(streamIdDO,users=users)

    email_cid = {}
    totalFetched = mergedDefectDOs.totalNumberOfRecords
    if totalFetched < 1:
        logging.info("No defects")
        sys.exit(totalFetched)
    logging.debug("Total fetched "+ repr(totalFetched))
    for md in mergedDefectDOs.mergedDefects:
        for attr in md.defectStateAttributeValues:
            logging.debug("Attribute is " + repr(attr) + "\n")
            if attr.attributeDefinitionId.name=="Owner":
               owner = attr.attributeValueId.name
               logging.debug("\n\n***********  Found owner " + owner)
               if owner not in email_cid:
                        email_cid[owner] = []
               if md.cid not in email_cid[owner]:
                        email_cid[owner].append(md)
               break

    logging.debug(repr(md))
    if len(email_cid) == 0:
        logging.info("Nothing to notify about")
        sys.exit(0)

    if options.project:
        subject = "Outstanding defects assigned to you in Coverity Project "+options.project
    else:
        subject = "Outstanding defects assigned to you in Coverity Projects"
    project_id = None
    url = None
    if options.project and '*' not in options.project:
        project_id =configServiceClient.get_project_id(options.project)
        logging.debug("Project id is " + repr(project_id))
    else:
        if options.project:
            projectDOs = configServiceClient.get_projects(options.project)
        else:
            projectDOs = configServiceClient.get_projects()
            logging.debug("Got Project DOs " + str(len(projectDOs)))
    if options.days == 1:
        leadin = "<html>\n<br>\n<br>The following defects were newly detected in the past 24 hours<br>\n"
    else:
        leadin = "<html>\n<br>\n<br>The following defects were newly detected in the past " + str(options.days) + " days<br>\n"
    leadinOthers = "\n<br>\n<br>In addition the following existing unresolved defects are assigned to you:<br>\n"

    if project_id:
        projId=str(project_id)
    for u in email_cid.keys():
        body = leadin
        restOfBody = leadinOthers
        for md in email_cid[u]:
            if not project_id:
                (projId,streamDefectId) = defectServiceClient.get_project_for_CID_and_user(projectDOs, md.cid, u)
                url = defectServiceClient.create_url(md.cid, projId,streamDefectId)
            else:
                url = defectServiceClient.create_url(md.cid, projId)
            logging.debug("First detected " + md.firstDetected.strftime('%Y/%m/%d'))
            if md.firstDetected > cutoff:
                body = body + "New CID " + str(md.cid) + ":\n<br>   Issue " + md.checkerName + " in file " + md.filePathname + " was detected on " + md.firstDetected.strftime('%Y/%m/%d') + ". \n<br> <a href=" + url + ">" + url + "</a>\n<br>\n"
            else:
                restOfBody = restOfBody + "CID " + str(md.cid) + ": " + md.checkerName + ". <a href=" + url + ">" + url + "</a><br>\n"

        body = body + restOfBody + "</html>"
        #server = smtplib.SMTP('smtp.gmail.com',587)
        server = 'localhost'
        fromaddr = "asya@10gen.com"
        if options.testing == True:
            logging.warning("Testing: no actual e-mail will be sent")
            print "Username:  " + u
            print "Subject:   " + subject
            print body
        else:
            logging.debug("Users:" + str(u))
            logging.debug("Subject:" + str(subject))
            logging.debug("Body:" + str(body))
            try:
                sent = False
                resp = configServiceClient.send_notifications(u+"@local", subject, body)
                logging.info("Mail sent to %d recepient" % (len(resp)))
                if len(resp) > 0: sent=True
            except Exception, err:
                logging.error(str(err))
                logging.error("Mail not sent to " + u)
                sent=False
            # now fall back on doing a regular email send...
            if sent == False:
                logging.info("Sending e-mail the regular way since notify failed")
                udo = configServiceClient.user_details(u)
                toaddr = udo.email
                msg = ("Subject: %s\nFrom: %s\nTo: %s\n\n" % (subject, fromaddr, toaddr)) + body
                server.sendmail(fromaddr, toaddr, msg)
                server.quit()

# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
