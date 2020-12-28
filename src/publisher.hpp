//
// Created by Lee (lee.luoman@gmail.com) on 2020/12/20.
//

#ifndef SIOCLIENT_PUBLISHER_HPP
#define SIOCLIENT_PUBLISHER_HPP
#include <string>
#include <vector>
#include "sioclient/sio_client.h"
#include "pcl/point_types.h"
#include "pcl/point_cloud.h"
#include "opencv2/opencv.hpp"

namespace {
union U {
  int i = 0xFF00;
  unsigned char c;
} u;

std::string base64_encode(unsigned char const* bytes_to_encode, unsigned int in_len) {
  static const std::string base64_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  std::stringstream ss;
  int i = 0, j = 0;
  unsigned char char_array_3[3];
  unsigned char char_array_4[4];

  while (in_len--) {
    char_array_3[i++] = *(bytes_to_encode++);
    if (i == 3) {
      char_array_4[0] = (char_array_3[0] & 0xFC) >> 2;
      char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xF0) >> 4);
      char_array_4[2] = ((char_array_3[1] & 0x0F) << 2) + ((char_array_3[2] & 0xC0) >> 6);
      char_array_4[3] = char_array_3[2] & 0x3F;
      for (i = 0; (i < 4); i++) {
        ss << base64_chars[char_array_4[i]];
      }
      i = 0;
    }
  }

  if (i > 0) {
    for (j = i; j < 3; j++) {
      char_array_3[j] = '\0';
    }
    char_array_4[0] = (char_array_3[0] & 0xFC) >> 2;
    char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xF0) >> 4);
    char_array_4[2] = ((char_array_3[1] & 0x0F) << 2) + ((char_array_3[2] & 0xC0) >> 6);
    for (j = 0; (j < i + 1); j++) {
      ss << base64_chars[char_array_4[j]];
    }
    while ((i++ < 3)) {
      ss << '=';
    }
  }
  return ss.str();
}

std::string SerializePointCloud(const pcl::PointCloud<pcl::PointXYZ>::Ptr cloud,
                                const std::string frame_id = "",
                                const unsigned int r = 0,
                                const unsigned int g = 0,
                                const unsigned int b = 0,
                                const float x = 0.0f,
                                const float y = 0.0f,
                                const float z = 0.0f) {
  if(cloud == nullptr) {
    return "";
  }
  struct MessageHeader {
    unsigned char big_endian = u.c;
    unsigned char size[4];
    unsigned char frame_id[8];
    unsigned char rgb[3];
    float origin[3];
  } header;
  memcpy(header.frame_id, frame_id.c_str(), frame_id.size() < 8 ? frame_id.size() : 8);
  header.rgb[0] = r;
  header.rgb[1] = g;
  header.rgb[2] = b;
  header.origin[0] = 1.1f;
  header.origin[1] = 1.2f;
  header.origin[2] = 1.3f;

  float points[cloud->size() * 3];
  for(int i = 0; i < cloud->size(); ++i) {
    std::cout << cloud->at(i).x << ", " << cloud->at(i).y << ", " << cloud->at(i).z << std::endl;
    points[i * 3 + 0] = cloud->at(i).x;
    points[i * 3 + 1] = cloud->at(i).y;
    points[i * 3 + 2] = cloud->at(i).z;
  }
  size_t length = sizeof(MessageHeader) + cloud->size() * 3 * 4;
  header.size[0] = char((uint32_t)length >> 24);
  header.size[1] = char((uint32_t)length >> 16);
  header.size[2] = char((uint32_t)length >> 8);
  header.size[3] = char((uint32_t)length >> 0);
  unsigned char msg[length];
  memcpy(msg, &header, sizeof(MessageHeader));
  memcpy(msg + sizeof(MessageHeader), &points, cloud->size() * 3 * 4);
  return base64_encode(msg, length);
}

std::string SerializeImage(const cv::Mat img, const unsigned int image_quality) {
  std::vector<uchar> buf;
  const std::vector<int> params{static_cast<int>(cv::IMWRITE_JPEG_QUALITY), static_cast<int>(image_quality)};
  cv::imencode(".jpg", img, buf, params);
  const auto char_buf = reinterpret_cast<const unsigned char*>(buf.data());
  const std::string base64_serial = base64_encode(char_buf, buf.size());
  return base64_serial;
}
}

namespace webviewer {
class Publisher {
 public:
  Publisher(const std::string &server_uri) : client_() {
    client_.set_open_listener([](){
      printf("connected to server\n");
    });
    client_.set_close_listener([](sio::client::close_reason const& reason){
      printf("connection closed correctly\n");
    });
    client_.set_fail_listener([](){
      printf("connection closed incorrectly\n");
    });
    client_.connect(server_uri);
  }

  void AddPointCloud(const pcl::PointCloud<pcl::PointXYZ>::Ptr cloud,
                     const std::string frame_id = "",
                     const unsigned int r = 255,
                     const unsigned int g = 255,
                     const unsigned int b = 255,
                     const float x = 0.0f,
                     const float y = 0.0f,
                     const float z = 0.0f) {
    auto buff = SerializePointCloud(cloud, frame_id, r, g, b, x, y, z);
    if(!buff.empty()) {
      client_.socket()->emit("pointcloud", buff);
    }
  }
  void AddImage(const cv::Mat img, const unsigned int image_quality) {
    auto buff = SerializeImage(img, image_quality);
    if(!buff.empty()) {
      client_.socket()->emit("image", buff);
    }
  }
 private:
  sio::client client_;
};
} //namespace webviewer
#endif //SIOCLIENT_PUBLISHER_HPP
