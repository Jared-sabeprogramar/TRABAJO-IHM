package com.nexus.access.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import java.net.URI; import java.net.http.*; import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test; import org.springframework.beans.factory.annotation.Autowired; import org.springframework.boot.test.context.SpringBootTest; import org.springframework.boot.test.web.server.LocalServerPort; import org.springframework.test.context.ActiveProfiles;
import com.nexus.access.backend.user.UserRepository;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SecurityIntegrationTest {
	@LocalServerPort int port; @Autowired UserRepository users;
	final HttpClient client=HttpClient.newHttpClient(); final ObjectMapper json=new ObjectMapper().findAndRegisterModules();
	@Test void registerLoginSecurityOwnershipRefreshAndLogout() throws Exception {
		String tag=UUID.randomUUID().toString().substring(0,8); String email="security."+tag+"@example.com"; RegisterRequest register=new RegisterRequest("Secure","User",email,"PasswordSegura123");
		assertEquals(201, post("/api/auth/register",register,null).statusCode()); assertEquals(409,post("/api/auth/register",register,null).statusCode());
		assertEquals("USER",users.findByEmailIgnoreCase(email).orElseThrow().getRole()); assertNotEquals("PasswordSegura123",users.findByEmailIgnoreCase(email).orElseThrow().getPasswordHash());
		assertEquals(401,post("/api/auth/login",new LoginRequest(email,"wrong"),null).statusCode()); assertEquals(401,post("/api/auth/login",new LoginRequest("missing."+tag+"@example.com","wrong"),null).statusCode());
		var login=json.readTree(post("/api/auth/login",new LoginRequest(email,"PasswordSegura123"),null).body()); String access=login.get("accessToken").asText(), refresh=login.get("refreshToken").asText(); assertEquals("Bearer",login.get("tokenType").asText()); assertFalse(access.contains("PasswordSegura123"));
		assertEquals(401,get("/api/places",null).statusCode()); assertEquals(401,get("/api/places","Bearer invalid.token").statusCode()); assertEquals(200,get("/api/places","Bearer "+access).statusCode()); assertEquals(403,post("/api/places",java.util.Map.of("name","x"),"Bearer "+access).statusCode());
		UUID id=users.findByEmailIgnoreCase(email).orElseThrow().getId(); assertEquals(200,get("/api/users/"+id,"Bearer "+access).statusCode());
		var rotated=json.readTree(post("/api/auth/refresh",new RefreshTokenRequest(refresh),null).body()); assertEquals(401,post("/api/auth/refresh",new RefreshTokenRequest(refresh),null).statusCode()); String fresh=rotated.get("refreshToken").asText(); assertEquals(204,post("/api/auth/logout",new LogoutRequest(fresh),"Bearer "+access).statusCode()); assertEquals(401,post("/api/auth/refresh",new RefreshTokenRequest(fresh),null).statusCode());
	}
	private HttpResponse<String> post(String path,Object body,String authorization)throws Exception{return client.send(HttpRequest.newBuilder(URI.create(url(path))).header("Content-Type","application/json").header("Authorization",authorization==null?"":authorization).POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());}
	private HttpResponse<String> get(String path,String authorization)throws Exception{return client.send(HttpRequest.newBuilder(URI.create(url(path))).header("Authorization",authorization==null?"":authorization).GET().build(),HttpResponse.BodyHandlers.ofString());}
	private String url(String path){return "http://localhost:"+port+path;}
}
