cmake_minimum_required ( VERSION 3.0.2 )

project ( lab6 )

set ( CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/bin )

include_directories ( ${CMAKE_SOURCE_DIR}/labhelper )

# External libraries.
include_directories ( ${CMAKE_SOURCE_DIR}/external/imgui-1.49 )
include_directories ( ${CMAKE_SOURCE_DIR}/external/stb-1.0 )

find_package ( SDL2 REQUIRED )
include_directories ( ${SDL2_INCLUDE_DIRS} )

# Build and link executable.
add_executable ( lab6 lab6_main.cpp hdr.cpp fbo.cpp )
target_link_libraries ( lab6 labhelper )
