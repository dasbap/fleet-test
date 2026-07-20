if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "C:/Users/da silva/.gradle/caches/8.13/transforms/8ca4a2cabfbd5f4eab2ad2a4b52b87ed/transformed/fbjni-0.7.0/prefab/modules/fbjni/libs/android.arm64-v8a/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/da silva/.gradle/caches/8.13/transforms/8ca4a2cabfbd5f4eab2ad2a4b52b87ed/transformed/fbjni-0.7.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

