
#include <iostream>

extern "C" { void __coverity_panic__(); }
extern "C" { size_t unknownstrlen(void *); }

#define MONGO_COMPILER_NORETURN

namespace mongo {

 class StringData {
       public:
           size_t size() const { return unknownstrlen((void *)this); }
 };

}

