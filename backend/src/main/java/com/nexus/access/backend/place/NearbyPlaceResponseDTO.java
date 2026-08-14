package com.nexus.access.backend.place;
import java.util.UUID; import com.nexus.access.backend.common.LocationDTO;
public record NearbyPlaceResponseDTO(UUID id,String name,String address,int accessibilityScore,double distanceMeters,LocationDTO location){}
