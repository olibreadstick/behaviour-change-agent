package com.behaviourchange.backend.service;

import com.behaviourchange.backend.model.Participant;
import com.behaviourchange.backend.repository.ParticipantRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ParticipantService {

    private final ParticipantRepository participantRepository; 

    public ParticipantService(ParticipantRepository participantRepository) 
{
this.participantRepository = participantRepository;
}

    public List<Participant> getAllParticipants() {
        return participantRepository.findAll();
    }

    public Participant getParticipantById(String participantId) {
        return participantRepository
.findById(participantId)
.orElse(null);
}
                        
    public Participant createParticipant(Participant participant) {
        return participantRepository.save(participant);
    }
}
