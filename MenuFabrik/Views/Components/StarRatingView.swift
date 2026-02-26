import SwiftUI

struct StarRatingView: View {
    @Binding var rating: Int
    var maxRating: Int = 5
    
    var body: some View {
        HStack {
            Text("Note:")
            Spacer()
            ForEach(1...maxRating, id: \.self) { index in
                Image(systemName: index <= rating ? "star.fill" : "star")
                    .foregroundColor(.yellow)
                    .onTapGesture {
                        // Toggle off if tapping the current rating (to set to 0)
                        if rating == index {
                            rating = 0
                        } else {
                            rating = index
                        }
                    }
            }
        }
    }
}
