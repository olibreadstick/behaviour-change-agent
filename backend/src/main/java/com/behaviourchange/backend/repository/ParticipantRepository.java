package com.behaviourchange.backend.repository;

import com.behaviourchange.backend.model.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ParticipantRepository
        extends JpaRepository<Participant, String> {

    Optional<Participant> findByUsernameIgnoreCase(String username);
}