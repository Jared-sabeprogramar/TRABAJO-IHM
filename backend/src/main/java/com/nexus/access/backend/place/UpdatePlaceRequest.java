package com.nexus.access.backend.place;
import jakarta.validation.Valid; import jakarta.validation.constraints.*; import com.nexus.access.backend.common.LocationDTO;
public record UpdatePlaceRequest(@NotBlank @Size(max=200) String name,String description,@Size(max=255) String address,@Size(max=120) String city,@Size(max=120) String district,@NotBlank @Size(max=80) String placeType,@Min(0) @Max(100) int accessibilityScore,@NotNull @Valid LocationDTO location,boolean active){}
