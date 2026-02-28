import SwiftUI
import SwiftData

struct ParticipantBubbleGroup: View {
    let allParticipants: [Participant]
    @Binding var selectedParticipants: Set<Participant>
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(allParticipants) { participant in
                    let isSelected = selectedParticipants.contains(participant)
                    
                    VStack {
                        ZStack {
                            Circle()
                                .fill(isSelected ? Color.blue.opacity(0.15) : Color.gray.opacity(0.1))
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Circle().stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
                                )
                            
                            if let data = participant.photoData, let uiImage = UIImage(data: data) {
                                Image(uiImage: uiImage)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 40, height: 40)
                                    .clipShape(Circle())
                                    .opacity(isSelected ? 1.0 : 0.4)
                            } else {
                                Text(String(participant.name.prefix(1)).uppercased())
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundColor(isSelected ? .blue : .gray)
                            }
                        }
                        
                        Text(participant.name)
                            .font(.caption2)
                            .fontWeight(isSelected ? .semibold : .regular)
                            .foregroundColor(isSelected ? .primary : .secondary)
                            .lineLimit(1)
                            .frame(maxWidth: 50)
                    }
                    .onTapGesture {
                        let impact = UIImpactFeedbackGenerator(style: .light)
                        impact.impactOccurred()
                        
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                            if isSelected {
                                selectedParticipants.remove(participant)
                            } else {
                                selectedParticipants.insert(participant)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 8)
        }
    }
}
