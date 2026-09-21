import importlib
import unittest
from unittest.mock import Mock, patch

with patch.dict("sys.modules", {"requests": Mock()}):
    isolar_cloud = importlib.import_module("services.isolar_cloud")

ISolarCloudClient = isolar_cloud.ISolarCloudClient
ISolarCloudError = isolar_cloud.ISolarCloudError


class ISolarCloudResponseTests(unittest.TestCase):
    def setUp(self):
        self.client = object.__new__(ISolarCloudClient)
        self.client.appkey = "test-app-key"
        self.client.secret_key = "test-secret"
        self.client.gateway = "https://example.invalid"
        self.client._tokens = {"access_token": "test-token", "expires_at": float("inf")}

    @patch.object(isolar_cloud.requests, "post")
    def test_null_result_data_raises_upstream_error(self, post):
        post.return_value = Mock()
        post.return_value.json.return_value = {
            "result_code": "1234",
            "result_msg": "No access to plant",
            "result_data": None,
        }

        with self.assertRaisesRegex(ISolarCloudError, "result_code=1234"):
            self.client.get_devices("1764020")

    @patch.object(isolar_cloud.requests, "post")
    def test_valid_devices_response_is_unchanged(self, post):
        devices = [{"device_sn": "A2522714790"}]
        post.return_value = Mock()
        post.return_value.json.return_value = {
            "result_code": "1",
            "result_data": {"pageList": devices},
        }

        self.assertEqual(self.client.get_devices("1764020"), devices)


if __name__ == "__main__":
    unittest.main()
