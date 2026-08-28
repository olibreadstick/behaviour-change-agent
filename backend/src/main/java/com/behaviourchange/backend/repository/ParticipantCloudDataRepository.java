package com.behaviourchange.backend.repository;

import com.behaviourchange.backend.model.ParticipantCloudData;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ParticipantCloudDataRepository
    extends JpaRepository<ParticipantCloudData, Long> {

    List<ParticipantCloudData> findByParticipantIdOrderByDataKeyAsc(String participantId);

    Optional<ParticipantCloudData> findByParticipantIdAndDataKey(
        String participantId,
        String dataKey
    );
}
