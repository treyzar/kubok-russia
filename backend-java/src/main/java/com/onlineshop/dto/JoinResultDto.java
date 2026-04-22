package com.onlineshop.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.onlineshop.domain.entity.FairPlayer;

import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record JoinResultDto(FairPlayer player, FairRoomDto room, boolean scaled, UUID newRoomId) {}
