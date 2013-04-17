#include <iostream>

extern "C" { void __coverity_panic__(); }

#define MONGO_COMPILER_NORETURN

namespace mongo {

    MONGO_COMPILER_NORETURN void verifyFailed(const char *msg, const char *file, unsigned line) {
	__coverity_panic__();
    }
    MONGO_COMPILER_NORETURN void fassertFailed( int msgid ) {
	__coverity_panic__();
    }
    
    MONGO_COMPILER_NORETURN void uasserted(int msgid, const char *msg) {
	__coverity_panic__();
    }
    MONGO_COMPILER_NORETURN void uasserted(int msgid , const std::string &msg) {
	__coverity_panic__();
    }

    MONGO_COMPILER_NORETURN void msgassertedNoTrace(int msgid, const char *msg) {
	__coverity_panic__();
    }
    MONGO_COMPILER_NORETURN void msgasserted(int msgid, const char *msg) {
	__coverity_panic__();
    }
    MONGO_COMPILER_NORETURN void msgasserted(int msgid, const std::string &msg) {
	__coverity_panic__();
    }


}

