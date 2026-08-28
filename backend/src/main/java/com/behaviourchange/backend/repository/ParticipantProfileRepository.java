package com.behaviourchange.backend.repository;

import com.behaviourchange.backend.model.ParticipantProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ParticipantProfileRepository
        extends JpaRepository<ParticipantProfile, String> {
}
