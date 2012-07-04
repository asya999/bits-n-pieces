from WebService import WSOpts
from DefectService import DefectServiceClient
from ConfigService import ConfigServiceClient
import datetime
import sys
import logging

# create and send notifications to all users who who subscribed to a component that had newly detected defects in the latest snapshot
def main():

    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    # use --test flag to avoid sending e-mail while debugging this script
    parser.add_option("--test",  action="store_true", dest="testing",  default="False", help="Testing flag: no mail just echo to stdout");
    parser.add_option("--last",  action="store_true", dest="last",  help="Notify about last commit: project or stream MUST be specified");

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('last','stream'),('last','project')):
        logging.error("Must specify --last with either --stream or --project")
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options)
    defectServiceClient = DefectServiceClient(options)

    streamIdDOs = configServiceClient.get_streams(options.project,options.stream)
    if not streamIdDOs:
        logging.error("No valid streams found")
        sys.exit(-1)

    cws = configServiceClient.get_components_with_subscribers(options.project,options.stream)
    if len(cws) == 0:
        logging.warning("No subscribers for specified streams/projects")
        sys.exit(-1)
    logging.debug([(c.componentId.name, c.subscribers) for c in cws])
    comps = [c.componentId.name for c in cws]

    total = 0
    mds = []
    for streamIdDO in streamIdDOs:
        lastSnapshotIdDO = configServiceClient.get_last_snapshot(streamIdDO)
        nextToLastSnapshotIdDO = configServiceClient.get_next_to_last_snapshot(streamIdDO)
        logging.debug(lastSnapshotIdDO)
        logging.debug(nextToLastSnapshotIdDO)
        mergedDefectsDOs = defectServiceClient.get_merged_defects_by_snapshot(lastSnapshotIdDO, streamIdDO, nextToLastSnapshotIdDO)
        logging.debug(mergedDefectsDOs.totalNumberOfRecords)
        if mergedDefectsDOs.totalNumberOfRecords > 0:
            total += mergedDefectsDOs.totalNumberOfRecords
            mds.extend(mergedDefectsDOs.mergedDefects)

    if total == 0:
        print "No records new in latest snapshots"
        sys.exit(0)

    md = [m for m in mds if m.componentName in comps]
    if len(md) == 0:
        print "No records found for notification"
        sys.exit(0)

    # iterate over merged defects
    email_cid = {}
    for mergedDefectDO in md:
        # if the component the defect belongs to has subscribers
        cName = mergedDefectDO.componentName
        componentDO = configServiceClient.get_component(cName)
        try:
            subscribers = componentDO.subscribers
        except:
            # shouldn't be here as we filtered out the defects without subscribers
            logging.debug("no subscribers for "+cName)
            continue
        else:
            # store user and defects in a dictionary
            for user in subscribers:
                if user not in email_cid:
                    email_cid[user] = {}
                if cName not in email_cid[user]:
                    email_cid[user][cName] = []
                if mergedDefectDO.cid not in email_cid[user]:
                    email_cid[user][cName].append(mergedDefectDO.cid)

    if len(email_cid) == 0:
        print "Nothing to notify about"
        sys.exit(0)

    logging.debug("Will notify %d users about %d defects" % (len(email_cid), len(mds)))

    if options.project:
        subject = "New defects found in your subscribed components of Coverity project "+options.project
    elif options.stream:
        subject = "New defects in your subscribed components of Coverity stream "+options.stream
    else:
        logging.warning("Not yet implemented")
    project_id = None
    url = None
    if options.project:
        project_id = configServiceClient.get_project_id(options.project)
    elif options.stream:
        pDO = configServiceClient.get_projects(None, options.stream)
        if len(pDO) == 0:
            logging.error("Stream %s doesn't have a primary parent owner" % (options.stream))
        project_id = configServiceClient.get_project_id(pDO[0].id.name)
    else:
        logging.warning("Not yet implemented")
    leadin = "<html>\n<br>The following new defects were found in your subscribed components in the latest snapshot:<br>\n"
    if project_id:
        projId=str(project_id)
        url = "http://"+options.host+":"+options.port+"/sourcebrowser.htm?projectId="+projId+"#mergedDefectId="
    for u in email_cid.keys():
        body = leadin
        for c in email_cid[u].keys():
            body = body + "Component " + c + ":<br>\n"
            for cid in email_cid[u][c]:
                U = url+str(cid)
                body = body + "  CID " + str(cid) + ": <a href " + U + ">" + U + "</a><br>\n"

        body = body + "</html>"
        if options.testing == True:
            logging.info("just testing")
            print u
            print subject
            print body
        else:
            logging.debug(u)
            logging.debug(subject)
            logging.debug(body)
            configServiceClient.send_notifications(u, subject, body)

# -----------------------------------------------------------------------------
if __name__ == '__main__':
    main()
