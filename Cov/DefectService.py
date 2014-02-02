from WebService import WebServiceClient
import base64
import logging
import zlib

# -----------------------------------------------------------------------------
# Class that implements webservices methods for Defects
class DefectServiceClient(WebServiceClient):
    def __init__(self, opt, configServiceClient = None):
        WebServiceClient.__init__(self, 'defect', opt.host, opt.port, opt.user, opt.password, opt.secure)
        if configServiceClient:
            self.configServiceClient = configServiceClient

    # return full struct of totals updated
    # this will process paging unless both start value and paging=True is specified
    # could add more filters here but may get unmanagable
    def get_merged_defects(self, streamIdDO, statusFilter=None, users=None, start=None, cids=None, components = None, paging = False, propertyKeyValues=None, lastTriaged=None, filename=None, cutoff=None):

        logging.debug(cids)
        logging.debug(users)
        mergedDefectFilterDO = self.client.factory.create('mergedDefectFilterSpecDataObj')
        if statusFilter and statusFilter != 'all':
            mergedDefectFilterDO.statusNameList = statusFilter
        elif not statusFilter:
            mergedDefectFilterDO.statusNameList = ['New','Triaged']
        if start and paging:
            self.pageSpecDO.startIndex = start
            #self.pageSpecDO.pageSize = paging
        else:
            self.pageSpecDO.startIndex = 0
        if users:
            mergedDefectFilterDO.ownerNameList = users
        if cids:
            if len(cids) < 500:
                mergedDefectFilterDO.cidList = cids
                therest = []
            else:
                mergedDefectFilterDO.cidList = cids[:500]
                therest = cids[500:]
        if components:
            cDOs = []
            for c in components:
                cDO = self.client.factory.create('componentIdDataObj')
                cDO.name = c
                cDO.append(cDO)
            mergedDefectFilterDO.componentIdList = cDOs
            mergedDefectFilterDO.componentIdExclude = False
        if propertyKeyValues:
            for pp in propertyKeyValues:
                mergedDefectFilterDO.defectPropertyKey = pp[0]
                mergedDefectFilterDO.defectPropertyPattern = pp[1]
        if lastTriaged:
            mergedDefectFilterDO.lastTriagedStartDate = lastTriaged
        if filename:
            mergedDefectFilterDO.filenamePatternList = ['*/'+filename,]
        if cutoff:
            mergedDefectFilterDO.lastDetectedStartDate = cutoff

        #logging.debug(mergedDefectFilterDO)
        logging.debug([s.name for s in streamIdDO])

        mergedDefectDOs = self.client.service.getMergedDefectsForStreams(streamIdDO, mergedDefectFilterDO, self.pageSpecDO)

        logging.debug("Number of defects gotten " + str(mergedDefectDOs.totalNumberOfRecords))
        if cids:
            stride = 500
            for index in range(0,len(therest),stride):
                mergedDefectFilterDO.cidList = therest[index:index+stride]
                moreDOs = self.client.service.getMergedDefectsForStreams(streamIdDO, mergedDefectFilterDO,self.pageSpecDO)
                if moreDOs.totalNumberOfRecords > 0:
                    mergedDefectDOs.mergedDefects.extend(moreDOs.mergedDefects)

        if mergedDefectDOs.totalNumberOfRecords > 0 and not paging and not start:
            have =  len(mergedDefectDOs.mergedDefects)
            while mergedDefectDOs.totalNumberOfRecords > have:
                self.pageSpecDO.startIndex = have
                moreDOs = self.client.service.getMergedDefectsForStreams(streamIdDO, mergedDefectFilterDO,self.pageSpecDO)
                if moreDOs.totalNumberOfRecords > 0:
                    mergedDefectDOs.mergedDefects.extend(moreDOs.mergedDefects)
                    have  = have + len(moreDOs.mergedDefects)

        return mergedDefectDOs

    def get_cid_from_dm(self, cid, label):
        cim_cid = self.client.service.getCIDForDMCID(cid, label)
        if cim_cid > 0:
            return cim_cid
        else:
            logging.error("Received invalid CID for DM CID " + str(cid))
            return None

    # returns mergedDefect in stream in snapshotId.
    # not filtering since they might have been dismissed or fixed since then
    # if second snapshot is specified, exclude defects in it
    def get_merged_defects_by_snapshot(self, snapshotIdDO, streamIdDO, excSnapIdDO=None):
        mergedDefectFilterDO = self.client.factory.create('mergedDefectFilterSpecDataObj')
        streamSnapshotFilterSpecDO = self.client.factory.create('streamSnapshotFilterSpecDataObj')
        streamSnapshotFilterSpecDO.snapshotIdIncludeList = snapshotIdDO
        streamSnapshotFilterSpecDO.streamId = streamIdDO
        if excSnapIdDO:
            streamSnapshotFilterSpecDO.snapshotIdExcludeList = excSnapIdDO
        logging.debug(streamSnapshotFilterSpecDO)
        mergedDefectFilterDO.streamSnapshotFilterSpecIncludeList = streamSnapshotFilterSpecDO
        self.pageSpecDO.startIndex = 0
        mergedDefectDOs = self.client.service.getMergedDefectsForStreams(streamIdDO, mergedDefectFilterDO, self.pageSpecDO)
        if mergedDefectDOs.totalNumberOfRecords < 1:
            logging.debug("No MDs")
            return mergedDefectDOs
        if mergedDefectDOs.totalNumberOfRecords > len(mergedDefectDOs.mergedDefects):
            have =  len(mergedDefectDOs.mergedDefects)
            while mergedDefectDOs.totalNumberOfRecords > have:
                self.pageSpecDO.startIndex = have
                moreDOs = self.client.service.getMergedDefectsForStreams(streamIdDO, mergedDefectFilterDO,self.pageSpecDO)
                if moreDOs.totalNumberOfRecords > 0:
                    mergedDefectDOs.mergedDefects.extend(moreDOs.mergedDefects)
                    have  = have + len(moreDOs.mergedDefects)

        else:
            logging.debug("Got all records: "+str(len(mergedDefectDOs.mergedDefects)))
        return mergedDefectDOs

    def get_merged_defects_since(self,streamIdDO,cutoff):
        mergedDefectFilterDO = self.client.factory.create('mergedDefectFilterSpecDataObj')
        mergedDefectFilterDO.statusNameList = ['New','Triaged']
        mergedDefectFilterDO.firstDetectedStartDate = cutoff
        self.pageSpecDO.startIndex = 0
        mergedDefectDOs = self.client.service.getMergedDefectsForStreams(streamIdDO, mergedDefectFilterDO, self.pageSpecDO)
        if mergedDefectDOs.totalNumberOfRecords < 1:
            return mergedDefectDOs
        if mergedDefectDOs.totalNumberOfRecords > len(mergedDefectDOs.mergedDefects):
            logging.warning("Need to add paging here!")
        return mergedDefectDOs

    # probably should null out all scope settings
    def set_scope(self, project=None, stream=None):
        if stream:
            scopePattern = None # '*/'+stream
        elif project:
            scopePattern = None # project+'/*'
        else:
            scopePattern = None # '*/*'
        return scopePattern

    def get_md_history(self,cid,streamIdDO):
        # return self.client.service.getMergedDefectHistory(cid,self.set_scope(project,stream))
        # for v7 getting rid of scope
        return self.client.service.getMergedDefectHistory(cid,streamIdDO)

    def get_cids_for_snapshot(self,snapshotIdDO):
        return self.client.service.getMergedDefectIdsForSnapshot(snapshotIdDO)

    # used when project is not passed to the script which needs it for context
    # given a list of all projectsDOs, CID and user, return the first project
    # (and corresponding stream defect)
    # in which CID exists and has user as the owner
    def get_project_for_CID_and_user(self, projectDOs, c_id, user):
        logging.debug("get_project_forCID_and_user: Got %d projectDOs, CID %d, user %s" % (len(projectDOs), c_id, user))
        cids = [c_id,]
        userlist = [user,]
        sd = None
        for proj in projectDOs:
            try:
            # for v4 need to include streamLinks as well
            #streamIdDOs = [s.id for s in getattr(proj,'streams',[])+getattr(proj,'streamLinks',[])]
                streamIdDOs = [s.id for s in self.get_pstreams(proj)]
            except:
                logging.debug("Error getting streamIDs for project" + proj.id.name)
                continue
            mDOs = self.get_merged_defects(streamIdDOs, users=userlist, cids=cids)
            if mDOs.totalNumberOfRecords > 0:
                projKey = proj.projectKey
                md = mDOs.mergedDefects[0]
                SDs = self.get_stream_defects(md.cid,scope=proj.id.name+"/*")
                if md.owner == user:
                    sd = SDs[0].id.id
                else:
                    for s in SDs:
                        if getattr(s,'owner','') == user:
                            sd = s.id.id
                            break
                logging.debug("Found stream defect %d project %s" % (sd, proj.id.name))
            else:
                logging.debug("No defect found for cid %d and user %s in project %s" % (c_id, user, proj.id.name))

        logging.debug("Found %d in %d" % (projKey,sd))
        return (projKey,sd)

    def get_project_for_CID(self, projectDOs, c_id):
        cids = [c_id,]
        filter = ['New','Triaged','Fixed','Dismissed']
        for proj in projectDOs:
            try:
                streamIdDOs = [s.id for s in proj.streams ]
            except:
                continue
            mDOs = self.get_merged_defects(streamIdDOs, cids=cids)
            if mDOs.totalNumberOfRecords > 0:
                return proj.projectKey
            else:
                mDOs = self.get_merged_defects(streamIdDOs, cids=cids, statusFilter=filter)
                if mDOs.totalNumberOfRecords > 0:
                    return proj.projectKey
        logging.warning("Unexpected error - CID not in list of projects " + str(c_id) + " " + projectDOs[0].id.name)
        return None

    def set_stream_filter_spec(self, stream=None, details=False, project=None, scope=None):
        streamDefectFilterDO = self.client.factory.create('streamDefectFilterSpecDataObj')
        # if scope:
        #// streamDefectFilterDO.scopePattern = scope
        # else:
        #// streamDefectFilterDO.scopePattern = self.set_scope(project, stream)
        streamDefectFilterDO.includeDefectInstances = details
        streamDefectFilterDO.includeHistory = details
        return streamDefectFilterDO

    def get_stream_defects(self,cid,details=True,scope='*/*'):
        return self.client.service.getStreamDefects(cid,self.set_stream_filter_spec(scope=scope, details=details))

    def get_num_stream_defect_occurrences(self,cid,stream):
        SDSpecDO = self.set_stream_filter_spec(stream, True)
        SDs = self.client.service.getStreamDefects(cid,SDSpecDO)
        numinstances = 0
        for sd in SDs:
            numinstances += len(getattr(sd,'defectInstances',[]))
        return numinstances

    def get_stream_defect_occurrences(self,cid,stream):
        SDSpecDO = self.set_stream_filter_spec(stream, True)
        SDs = self.client.service.getStreamDefects(cid,SDSpecDO)
        instances = []
        for sd in SDs:
            instances.extend(getattr(sd,'defectInstances',[]))
        return instances

    # clears extref field for given cid, scope
    def remove_extref(self,cid,stream,extrefstr,project=None):
        scopePattern = None # self.set_scope(project, stream)
        defectStateSpecDO = self.client.factory.create('defectStateSpecDataObj')
        defectStateSpecDO.externalReference = ' '
        self.update_stream_defect(cid,scopePattern,defectStateSpecDO)

    # sets defect occurrence property given key value pairs in given scope
    def set_defect_occurrences_property(self,cids,stream,prop_key,prop_value,project=None):
        streamDefectFilterDO = self.client.factory.create('streamDefectFilterSpecDataObj')
        # streamDefectFilterDO.scopePattern = self.set_scope(project, stream)
        streamDefectFilterDO.includeDefectInstances = True
        streamDefectFilterDO.includeHistory = True
        SDs = self.client.service.getStreamDefects(cids,streamDefectFilterDO)
        for sd in SDs:
            for di in getattr(sd,'defectInstances',[]):
                properties = []
                oldprops = getattr(di,'properties',[])
                logging.debug("Got properties " + str(oldprops))
                for p in oldprops:
                    if p.key != prop_key:
                        pSpecDO = self.client.factory.create('propertySpecDataObj')
                        pSpecDO.key = p.key
                        pSpecDO.value = p.value
                        properties.append(pSpecDO)
                if prop_value != '':
                    propertySpecDO = self.client.factory.create('propertySpecDataObj')
                    propertySpecDO.key = prop_key
                    propertySpecDO.value = prop_value
                    properties.append(propertySpecDO)
                logging.debug("Setting properties " + str(properties))
                self.client.service.updateDefectInstanceProperties(di.id, properties)

    def print_stream_defect_brief(self,cids,streamIdDO,project=None):
        streamDefectFilterDO = self.set_stream_filter_spec(stream=streamIdDO.name,project=project, details=True)
        logging.debug("Calling getStreamDefects with " + str(streamIdDO.name) + " and  cids " + str(cids))
        SDs = self.client.service.getStreamDefects(cids,streamDefectFilterDO)
        instances = []
        for sd in SDs:
            checker=sd.checkerSubcategoryId.checkerName+' '+str(sd.cid)
            for di in getattr(sd,'defectInstances',[]):
                File=di.function.fileId.filePathname
                for ev in di.events:
                    if ev.eventKind=="NORMAL":
                        print ev.fileId.filePathname + ":" + str(ev.lineNumber) + ":",
                        print checker + " " + ev.eventDescription

    def print_stream_defect_occurrences(self,cids,streamIdDO,project=None):
        streamDefectFilterDO = self.set_stream_filter_spec(stream=streamIdDO.name,project=project, details=True)
        SDs = self.client.service.getStreamDefects(cids,streamDefectFilterDO)
        instances = []
        for sd in SDs:
            print ''
            print "Defect "+str(sd.cid)+" ("+sd.checkerSubcategoryId.domain+")"
            print "  Checker "+sd.checkerSubcategoryId.checkerName+" (subcategory "+sd.checkerSubcategoryId.subcategory+")"
            for di in getattr(sd,'defectInstances',[]):
                try:
                    print "  File "+di.function.fileId.filePathname
                    print "  Function "+di.function.functionDisplayName
                except:
                    print "  Parse Warning (no function name available)"
                logging.debug("di.events size " +str(len(di.events)))
                for ev in di.events:
                    logging.debug(ev)
                    logging.debug(ev.eventKind)
                    logging.debug(ev.lineNumber)
                    if ev.eventKind=="NORMAL":
                        print "    " + ev.fileId.filePathname + ", line: " + str(ev.lineNumber)
                        print "    " + ev.eventDescription
                        logging.debug(len(zlib.decompress(base64.b64decode(self.client.service.getFileContents(streamIdDO,ev.fileId).contents))))
                        logging.debug(len(zlib.decompress(base64.b64decode(self.client.service.getFileContents(streamIdDO,ev.fileId).contents)).split('\n')))
                        print "    " + zlib.decompress(base64.b64decode(self.client.service.getFileContents(streamIdDO,ev.fileId).contents)).split('\n')[ev.lineNumber-1]

                print ""
                for p in getattr(di,'properties',[]):
                    print "    " + p.key + ": " + getattr(p,'value','')
                print ""

    def update_stream_defect(self, cid, scope, change_obj):
        """
            given a list of cids, scope and change data object, apply change
        """
        Ids = []
        streamDefectDOs = self.client.service.getStreamDefects(cid,False,scope)
        for sd in streamDefectDOs:
            streamDefectIdDO = self.client.factory.create('streamDefectIdDataObj')
            # seriously?
            streamDefectIdDO.id = sd.id.id
            streamDefectIdDO.verNum = sd.id.verNum
            Ids.append(streamDefectIdDO)
        if len(Ids) > 0:
            logging.debug(str(len(Ids)) + " stream defects to update total")
        try:
            self.client.service.updateStreamDefects(Ids, scope, change_obj)
        except Exception, err:
            logging.error("Exception: " + str(err))
            logging.error("Failed to apply change" + str(change_obj) + " to " + scope)

    def update_merged_defect(self, cids, scope, classification=None, severity=None, action=None, comment=None, owner=None):
        defectStateSpecDO = self.client.factory.create('defectStateSpecDataObj')
        if classification and classification != 'Unclassified':
            defectStateSpecDO.classification = classification
        if action and action != 'Undecided':
            defectStateSpecDO.action = action
        if severity and severity != 'Unknown':
            defectStateSpecDO.severity = severity
        if owner and owner != 'Unassigned':
            defectStateSpecDO.owner = owner
        if comment:
            defectStateSpecDO.comment = comment

        logging.debug("in update_merged: %d cids %s scope, %s" % (len(cids),scope,str(defectStateSpecDO)))

        self.update_stream_defect(cids, scope, defectStateSpecDO);

    def get_merged_defect_by_Merge_Key(self,mkey):
        for mergedDefect in g_mergedDefectDOs:
            if mergedDefect.mergeKey == mkey:
                g_mergedDefectDOs.remove(mergedDefect)
                return mergedDefect

    def copy_triage(self, cids, fromStream, toStream):
        if self.version != 'v4':
            logging.error("Sorry, copying triage is not supported past version 5.5")
            return
        self.client.service.copyStreamDefectStates(cids,fromStream, toStream)
