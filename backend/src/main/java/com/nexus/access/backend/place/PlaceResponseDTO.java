package com.nexus.access.backend.place;
import java.time.OffsetDateTime; import java.util.UUID; import com.nexus.access.backend.common.LocationDTO;
public record PlaceResponseDTO(UUID id,String name,String description,String address,String city,String district,String placeType,int accessibilityScore,LocationDTO location,boolean active,OffsetDateTime createdAt,OffsetDateTime updatedAt){}
