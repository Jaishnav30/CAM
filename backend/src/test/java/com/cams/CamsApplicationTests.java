package com.cams;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
    "app.security.admin.password=TestAdminBootPass123!"
})
class CamsApplicationTests {

    @Test
    void contextLoads() {
    }
}
