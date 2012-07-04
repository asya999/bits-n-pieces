from WebService import WSOpts

from DefectService import DefectServiceClient
from ConfigService import ConfigServiceClient
from urlparse import urlparse
import sys
import logging

# given project, CID construct URL
# given old URL, construct new URL
class makeUrl:

    def make_url(self, options, oldurl=None, cid=None, project=None):
        defectServiceClient = DefectServiceClient(options)
        configServiceClient = ConfigServiceClient(options)

        if oldurl:
            logging.debug("Parsing old DM URL")
            # parse URL into server, port and CID, expected format:
            # http://pop.sf.coverity.com:5467/cov.cgi?cid=18103
            o = urlparse(oldurl)
            server = o.hostname
            port = str(o.port)
            cidq = o.query.find("cid=")
            if cidq == -1:
                logging.error("No cid found in URL")
                return None
            oldcid = int(o.query[cidq+4:])
            logging.debug("Server is %s, port is %s, cid is %d" % (server, port, oldcid))
            # gotta assume label is port:server - can be changed to any mapping
            cid = defectServiceClient.get_cid_from_dm(oldcid, server+":"+port)
            logging.debug("CIM CID is %d" % (cid))

            # if not given a project, this _could_ return the wrong project URL
            # if the CID appears in more than one migrated DB
            # only way to check is by checking if snapshot IDs are in the range
            # which is not available through WS
            projectDOs = configServiceClient.get_projects(project)
            project_id =defectServiceClient.get_project_for_CID(projectDOs,cid)
        elif project and cid:
            project_id = configServiceClient.get_project_id(project)
        else:
            projectDOs = configServiceClient.get_projects(project)
            project_id = defectServiceClient.get_project_for_CID(projectDOs,cid)

        if not cid:
            return None
        if not project_id:
            return None

        logging.debug("Host %s, port %s, projectId %d, CID %s" % (options.host, options.port, project_id, cid))
        return defectServiceClient.create_url(cid, project_id)

# -----------------------------------------------------------------------------

def main():

    wsOpts = WSOpts()
    parser = wsOpts.get_common_opts()

    parser.add_option("--cid", dest="cid", help="CID for URL")
    parser.add_option("--url", dest="url", help="Defect Manager URL (server/port must be used as DM label during migration)")
    (options, args) = parser.parse_args()

    wsOpts.setLogging(options.debug)
    if wsOpts.checkRequiredMissing(options, ('cid',)):
        if wsOpts.checkRequiredMissing(options, ('url',)):
            parser.print_help()
            logging.error("Must specify EITHER cid or Defect Manager URL")
            print "\nMust specify EITHER cid or Defect Manager URL"
            sys.exit(-1)

    makeurl = makeUrl()
    url = makeurl.make_url(options, options.url, options.cid, options.project)
    if url:
        print url
    else:
        logging.error("No valid project for cid " + str(options.cid))
        sys.exit(-1)

if __name__ == '__main__':
    main()
