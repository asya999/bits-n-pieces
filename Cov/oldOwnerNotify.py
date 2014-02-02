
# This script requires suds that provides SOAP bindings for python.
#
# Download suds from https://fedorahosted.org/suds/
#
# unpack it and then run:
# python setup.py install
#
# This may require you to install setuptools (an .exe from python.org)

from WebService import WebServiceClient
from optparse import OptionParser
import cgi
import re
import datetime
import smtplib

# -----------------------------------------------------------------------------
# Class that implements webservices methods for Config
class ConfigServiceClient(WebServiceClient):
    def __init__(self, host, port, user, password):
        WebServiceClient.__init__(self, 'configuration', host, port, user, password)

    def get_all_streams(self):
        streamIdDOs = []
        StreamFilterSpecDO = self.client.factory.create('streamFilterSpecDataObj')
        StreamFilterSpecDO.typeList = ['STATIC',]
        streamDOs = self.client.service.getStreams(StreamFilterSpecDO)
        for s in streamDOs:
                streamIdDOs.append(s.id)
        return streamIdDOs

# -----------------------------------------------------------------------------
# Class that implements webservices methods for Defects
class DefectServiceClient(WebServiceClient):
    def __init__(self, host, port, user, password):
        WebServiceClient.__init__(self, 'defect', host, port, user, password)

    def get_merged_defects(self,streamIdDO):
        mergedDefectFilterDO = self.client.factory.create('mergedDefectFilterSpecDataObj')
        mergedDefectFilterDO.statusNameList = ['New','Triaged']
        mergedDefectDOs = self.client.service.getMergedDefectsForStreams(streamIdDO, mergedDefectFilterDO, self.pageSpecDO)
        return mergedDefectDOs


# -----------------------------------------------------------------------------
if __name__ == '__main__':

    parser = OptionParser()

    parser.add_option("--host",    dest="host",    help="host of CIM");
    parser.add_option("--port",    dest="port",      help="port of CIM");
    parser.add_option("--user",    dest="user",      help="CIM user");
    parser.add_option("--password",  dest="password",  help="CIM password");

    (options, args) = parser.parse_args()
    if (not options.host or
        not options.port or
        not options.user or
        not options.password):
        parser.print_help()
        sys.exit(-1)

    defectServiceClient = DefectServiceClient(options.host, options.port, options.user, options.password);
    configServiceClient = ConfigServiceClient(options.host, options.port, options.user, options.password);

    cutoff = datetime.datetime.today()-datetime.timedelta(1)

    streamIdDO = configServiceClient.get_all_streams()
    mergedDefectDOs = defectServiceClient.get_merged_defects(streamIdDO)

    new_cids = []
    totalFetched = mergedDefectDOs.totalNumberOfRecords
    if totalFetched < 1:
        print "No defects"
        sys.exit(1)
    else:
	print "Fetched "+ str(totalFetched) + " merged defects"
    for md in mergedDefectDOs.mergedDefects:
        try:
         if md.firstDetected > cutoff:
            new_cids.append(md.cid)
        except:
         pass

    if len(new_cids) == 0:
	print "No new defects to notify of"
	sys.exit(0)
    else:
	print "Emailing notification for %d new defects" % (len(new_cids))
    fromaddr = "noreply+coverity@coverity.com"
    # quoted list of comma separated email addresses this should go to
    toaddr = "manager@coverity.com,others@coverity.com"
    subject = "New defects detected in the past 24 hours by Coverity"
    body = "\nThe following %s defects were newly found and committed in the past 24 hours\n" % (len(new_cids))
    # replace by URL for your CIM server
    url = "http://cim.coversty.com:8080/sourcebrowser.htm?projectId=10001#mergedDefectId="
    server = smtplib.SMTP('mail.coverity.net')
    server.set_debuglevel(0)
    for cid in new_cids:
	body = body + "\nCID " + str(cid) + ": " + url + str(cid)
    msg = ("Subject: %s\nFrom: %s\nTo: %s\n\n" % (subject, fromaddr, toaddr)) + body
    server.sendmail(fromaddr, toaddr, msg)
    server.quit()
