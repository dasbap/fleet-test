if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "C:/Users/da silva/.gradle/caches/8.13/transforms/372fb416d6a6490712d9cba1067751fb/transformed/hermes-android-0.79.6-debug/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/da silva/.gradle/caches/8.13/transforms/372fb416d6a6490712d9cba1067751fb/transformed/hermes-android-0.79.6-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

