package io.aiven.klaw.model.response;

import io.aiven.klaw.model.enums.PromotionStatusType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PromotionStatus {
  @NotNull private PromotionStatusType status;

  private String sourceEnv;

  private String targetEnv;

  private String targetEnvId;

  private String topicName;

  private String error;
}
