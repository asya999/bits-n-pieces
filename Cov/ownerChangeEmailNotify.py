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
import datetime
import sys
import logging

def main():
    """
     create and send notifications to all users who were assigned
     any new defects in the past N days (N=1 or specified)
    """
    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    # use --test flag to avoid sending e-mail while debugging this script
    parser.set_defaults(testing="False")
    parser.add_option("--test",  action="store_true", dest="testing",  default="False", help="Testing flag: no mail just echo to stdout");
    parser.add_option("--days",  dest="days",  type=int, default=1, help="Days to check to notify about (default last 24 hours)");

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
    for md in mergedDefectDOs.mergedDefects:
        defectChangeDataObj = defectServiceClient.get_md_history(md.cid,options.project,options.stream)
        i = len(defectChangeDataObj)-1
        while i >= 0:
            if defectChangeDataObj[i].dateModified > cutoff and len(set(defectChangeDataObj[i].affectedStreams).difference(set(streamIdDO))) > 0:
                if getattr(defectChangeDataObj[i],'ownerChange',None):
                    new_owner = defectChangeDataObj[i].ownerChange.newValue
                    if new_owner not in email_cid:
                        email_cid[new_owner] = []
                    if md.cid not in email_cid[new_owner]:
                        email_cid[new_owner].append(md.cid)
                    break
            i = i - 1


    if len(email_cid) == 0:
        logging.info("Nothing to notify about")
        sys.exit(0)

    if options.project:
        subject = "New defects assigned to you in Coverity Project "+options.project
    else:
        subject = "New defects assigned to you in Coverity Projects"
    project_id = None
    url = None
    if options.project and '*' not in options.project:
        project_id =configServiceClient.get_project_id(options.project)
    else:
        if options.project:
            projectDOs = configServiceClient.get_projects(options.project)
        else:
            projectDOs = configServiceClient.get_projects()
            logging.debug("Got Project DOs " + str(len(projectDOs)))
    if options.days == 1:
        leadin = "<html>\n<br>The following defects were assigned to you in the past 24 hours<br>\n"
    else:
        leadin = "<html>\n<br>The following defects were assigned to you in the past " + str(options.days) + " days<br>\n"
    if project_id:
        projId=str(project_id)
    for u in email_cid.keys():
        body = leadin
        for cid in email_cid[u]:
            if not project_id:
                (projId,streamDefectId) = defectServiceClient.get_project_for_CID_and_user(projectDOs, cid, u)
                url = defectServiceClient.create_url(cid, projId,streamDefectId)
            else:
                url = defectServiceClient.create_url(cid, projId)
            body = body + "CID " + str(cid) + ": <a href " + url + ">" + url + "</a><br>\n"

        body = body + "</html>"
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
                resp = configServiceClient.send_notifications(u, subject, body)
                logging.debug("Mail sent to %d recepient" % (len(resp)))
            except Exception, err:
                logging.error(str(err))
                logging.error("Mail not sent to " + u)

# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
